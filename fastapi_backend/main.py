"""
SafePlant AIoT — Industrial Safety Monitoring FastAPI Server
Authoritative backend for ESP32 telemetry, CameraX intrusion incidents,
threshold validation, WebSocket streaming, FCM push, and MSG91 SMS dispatch.
"""

import os
import time
import json
import sqlite3
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from fcm_notifier import send_fcm_alert, register_device_token
from sms_provider import send_msg91_safety_alert

DB_PATH = os.getenv("SAFEPLANT_DB_PATH", "safeplant.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Telemetry History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        device_id TEXT NOT NULL,
        temperature REAL,
        humidity REAL,
        gas_raw REAL,
        flame INTEGER,
        relay_state TEXT DEFAULT 'OFF',
        buzzer_state TEXT DEFAULT 'OFF',
        rssi INTEGER DEFAULT -65
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp)")
    
    # 2. Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        last_observed_timestamp TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        zone TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        event_type TEXT NOT NULL,
        source_device TEXT NOT NULL,
        triggering_value TEXT,
        threshold_value TEXT,
        telemetry_snapshot TEXT,
        camera_details TEXT,
        notification_attempts TEXT,
        acknowledged INTEGER DEFAULT 0,
        resolved INTEGER DEFAULT 0,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        resolved_at TEXT,
        resolution_notes TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp)")

    # 3. Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

# In-memory settings defaults (Section 7)
DEFAULT_SETTINGS = {
    "tempWarningThreshold": 45.0,
    "tempCriticalThreshold": 50.0,
    "gasWarningThreshold": 1500,
    "gasCriticalThreshold": 2500,
    "humidityWarningThreshold": 75.0,
    "humidityCriticalThreshold": 85.0,
    "flameEventEnabled": True,
    "tempNotificationsEnabled": True,
    "gasNotificationsEnabled": True,
    "humidityNotificationsEnabled": False,
    "flameNotificationsEnabled": True,
    "intrusionAlertEnabled": True,
    "intrusionReminderCooldownSec": 15,
    "exitConfirmationSec": 5,
    "telemetryStaleTimeoutSec": 8,
    "smsDestinationNumber": "+91 98765 43210",
    "fcmNotificationsEnabled": False,
    "smsNotificationsEnabled": False
}

def load_settings() -> Dict[str, Any]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return DEFAULT_SETTINGS.copy()
    result = DEFAULT_SETTINGS.copy()
    for k, v in rows:
        try:
            result[k] = json.loads(v)
        except:
            result[k] = v
    return result

def save_settings_to_db(settings: Dict[str, Any]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for k, v in settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="SafePlant AIoT Backend",
    version="2.4.1",
    description="Industrial Safety Monitoring API for ESP32 and Android CameraX",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# WebSocket Connection Manager
# -----------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        text = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text)
            except:
                self.disconnect(connection)

manager = ConnectionManager()
active_hazard_keys = set()
server_start_epoch = time.time()

# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class TelemetryPacket(BaseModel):
    device_id: str = "ESP32-SAFEPLANT-01A"
    temperature_c: Optional[float] = None
    humidity_rh: Optional[float] = None
    gas_raw: Optional[float] = None
    flame_detected: Optional[bool] = None
    relay_state: Optional[str] = "OFF"
    buzzer_state: Optional[str] = "OFF"
    rssi_dbm: Optional[int] = -65
    timestamp: Optional[str] = None

class AiEventPayload(BaseModel):
    polygon_id: str
    people_count: int = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: Optional[str] = None
    idempotency_key: Optional[str] = None

class IncidentAcknowledgePayload(BaseModel):
    acknowledgedBy: Optional[str] = "Lead Safety Officer"

class IncidentResolvePayload(BaseModel):
    notes: Optional[str] = "Abnormality cleared and verified normal."

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "safeplant-fastapi-backend",
        "version": "2.4.1",
        "uptime_seconds": int(time.time() - server_start_epoch),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/status")
def status():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT timestamp, rssi, relay_state, buzzer_state FROM telemetry ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    settings = load_settings()
    now_epoch = time.time()
    
    last_seen = row[0] if row else None
    rssi = row[1] if row else 0
    relay = row[2] if row else "UNKNOWN"
    buzzer = row[3] if row else "UNKNOWN"

    is_stale = False
    is_connected = False
    if last_seen:
        try:
            dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
            diff = now_epoch - dt.timestamp()
            is_stale = diff > settings.get("telemetryStaleTimeoutSec", 8)
            is_connected = not is_stale
        except:
            is_connected = False

    return {
        "status": "nominal" if is_connected else ("stale_data" if is_stale else "disconnected"),
        "hardware_connected": is_connected,
        "esp32_last_seen": last_seen,
        "active_sensors_count": 4 if is_connected else 0,
        "firmware_version": "v2.4.1 (ESP-IDF / FreeRTOS)",
        "rssi": rssi,
        "relay_state": relay,
        "buzzer_state": buzzer,
        "actuator_mode": "commanded",
        "gas_unit": "Raw ADC (Uncalibrated MQ-2)",
        "fcm_configured": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")),
        "sms_configured": bool(os.getenv("MSG91_AUTH_KEY") and os.getenv("MSG91_TEMPLATE_ID"))
    }

@app.get("/api/telemetry/latest")
def get_latest_telemetry():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT device_id, timestamp, temperature, humidity, gas_raw, flame, relay_state, buzzer_state, rssi 
        FROM telemetry ORDER BY id DESC LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="No real hardware telemetry packets received yet")

    return {
        "device_id": row[0],
        "source": "esp32",
        "is_hardware": True,
        "timestamp": row[1],
        "temperature_c": row[2],
        "humidity_rh": row[3],
        "gas_ppm": row[4],
        "flame_detected": row[5],
        "relay_state": row[6],
        "buzzer_state": row[7],
        "actuator_mode": "commanded",
        "rssi_dbm": row[8]
    }

@app.get("/api/telemetry/history")
def get_telemetry_history(
    range: str = Query("1h", regex="^(1h|6h|24h|7d)$"),
    limit: int = Query(60, ge=1, le=200)
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, temperature, humidity, gas_raw, flame 
        FROM telemetry ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    history = [
        {
            "timestamp": r[0],
            "temperature": r[1],
            "humidity": r[2],
            "gas": r[3],
            "flame": r[4]
        }
        for r in reversed(rows)
    ]

    return {
        "range": range,
        "count": len(history),
        "history": history
    }

@app.post("/api/telemetry")
async def ingest_telemetry(packet: TelemetryPacket):
    ts = packet.timestamp or datetime.now(timezone.utc).isoformat()
    flame_int = 1 if packet.flame_detected else 0

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry (timestamp, device_id, temperature, humidity, gas_raw, flame, relay_state, buzzer_state, rssi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (ts, packet.device_id, packet.temperature_c, packet.humidity_rh, packet.gas_raw, flame_int, packet.relay_state, packet.buzzer_state, packet.rssi_dbm))
    conn.commit()
    conn.close()

    # Broadcast to WebSocket clients
    await manager.broadcast({
        "type": "TELEMETRY_UPDATE",
        "timestamp": ts,
        "data": {
            "device_id": packet.device_id,
            "source": "esp32",
            "is_hardware": True,
            "timestamp": ts,
            "temperature_c": packet.temperature_c,
            "humidity_rh": packet.humidity_rh,
            "gas_ppm": packet.gas_raw,
            "flame_detected": flame_int,
            "relay_state": packet.relay_state,
            "buzzer_state": packet.buzzer_state,
            "actuator_mode": "commanded",
            "rssi_dbm": packet.rssi_dbm
        }
    })

    return {"status": "received", "timestamp": ts}

@app.get("/api/incidents")
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    query = "SELECT * FROM incidents ORDER BY timestamp DESC"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r[0],
            "timestamp": r[1],
            "title": r[3],
            "description": r[4],
            "zone": r[5],
            "severity": r[6],
            "status": r[7],
            "eventType": r[8],
            "sourceDevice": r[9],
            "triggeringValue": r[10],
            "thresholdValue": r[11],
            "notificationAttempts": json.loads(r[14]) if r[14] else [],
            "acknowledged": bool(r[15]),
            "resolved": bool(r[16]),
            "acknowledgedAt": r[17],
            "acknowledgedBy": r[18],
            "resolvedAt": r[19],
            "resolutionNotes": r[20]
        })

    if status and status != "all":
        results = [i for i in results if i["status"] == status]
    if severity and severity != "all":
        results = [i for i in results if i["severity"] == severity]

    return results

@app.patch("/api/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: str, payload: IncidentAcknowledgePayload):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE incidents 
        SET status = 'acknowledged', acknowledged = 1, acknowledged_at = ?, acknowledged_by = ?
        WHERE id = ?
    """, (now_iso, payload.acknowledgedBy, incident_id))
    conn.commit()
    conn.close()

    await manager.broadcast({"type": "INCIDENT_UPDATE", "timestamp": now_iso})
    return {"status": "acknowledged", "id": incident_id}

@app.patch("/api/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, payload: IncidentResolvePayload):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE incidents 
        SET status = 'resolved', resolved = 1, resolved_at = ?, resolution_notes = ?
        WHERE id = ?
    """, (now_iso, payload.notes, incident_id))
    conn.commit()
    conn.close()

    await manager.broadcast({"type": "INCIDENT_UPDATE", "timestamp": now_iso})
    return {"status": "resolved", "id": incident_id}

@app.get("/api/settings")
def get_settings():
    return load_settings()

@app.put("/api/settings")
def update_settings(updates: Dict[str, Any]):
    current = load_settings()
    current.update(updates)

    # Validate warning < critical
    if current["tempWarningThreshold"] >= current["tempCriticalThreshold"]:
        raise HTTPException(status_code=422, detail="Temperature warning must be less than critical threshold")
    if current["gasWarningThreshold"] >= current["gasCriticalThreshold"]:
        raise HTTPException(status_code=422, detail="Gas warning must be less than critical threshold")

    save_settings_to_db(current)
    return {"message": "Settings updated", "settings": current}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
