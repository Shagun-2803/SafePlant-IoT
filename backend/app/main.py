"""
SafePlant AIoT — FastAPI Authoritative Backend Entry Point
FastAPI + SQLite + WebSockets + Telemetry Evaluation + Alert Notifications.
Binds to 0.0.0.0 for physical LAN connectivity with ESP32 and Android hardware.
"""
import os
import time
import json
from typing import List
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, get_connection, load_settings
from .routers import telemetry, incidents, settings, ai, notifications

# Server start time
START_EPOCH = time.time()

# WebSocket Connection Manager
class WebSocketConnectionManager:
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
        for conn in list(self.active_connections):
            try:
                await conn.send_text(text)
            except Exception:
                self.disconnect(conn)

ws_manager = WebSocketConnectionManager()

# Hook broadcaster into telemetry and incident routers
telemetry.set_ws_broadcaster(ws_manager.broadcast)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="SafePlant AIoT Backend",
    version="2.4.1",
    description="Authoritative industrial safety backend for ESP32 and Android CameraX",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(telemetry.router)
app.include_router(incidents.router)
app.include_router(settings.router)
app.include_router(ai.router)
app.include_router(notifications.router)

# Core System Health
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "safeplant-fastapi-backend",
        "version": "2.4.1",
        "uptime_seconds": int(time.time() - START_EPOCH),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ESP32 Gateway Hardware & Connection Status
@app.get("/api/status")
def status():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, rssi, relay_state, buzzer_state 
        FROM telemetry 
        ORDER BY id DESC LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()

    app_settings = load_settings()
    now_epoch = time.time()

    last_seen = row["timestamp"] if row else None
    rssi = row["rssi"] if row else 0
    relay = row["relay_state"] if row else "UNKNOWN"
    buzzer = row["buzzer_state"] if row else "UNKNOWN"

    is_stale = False
    is_connected = False
    if last_seen:
        try:
            dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
            diff = now_epoch - dt.timestamp()
            stale_threshold = app_settings.get("telemetryStaleTimeoutSec", 8)
            is_stale = diff > stale_threshold
            is_connected = not is_stale
        except Exception:
            is_connected = False

    return {
        "status": "nominal" if is_connected else ("stale_data" if is_stale else "disconnected"),
        "hardware_connected": is_connected,
        "esp32_last_seen": last_seen,
        "active_sensors_count": 4 if is_connected else 0,
        "firmware_version": "v2.4.1 (ESP-IDF / FreeRTOS Arduino)",
        "rssi": rssi,
        "relay_state": relay,
        "buzzer_state": buzzer,
        "actuator_mode": "commanded",
        "gas_unit": "Raw ADC (Uncalibrated MQ-2)",
        "fcm_configured": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")),
        "sms_configured": bool(os.getenv("MSG91_AUTH_KEY") and os.getenv("MSG91_TEMPLATE_ID"))
    }

# Live Streaming WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial handshake message
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "server": "SafePlant FastAPI v2.4.1",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
        while True:
            # Keep connection open, handle client heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
