"""
SafePlant AIoT — Telemetry Router
Ingests ESP32 packets, evaluates thresholds, tracks incident lifecycles,
commands actuators, and stores telemetry in SQLite.
"""
import uuid
import json
import time
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status

from ..database import get_connection, load_settings
from ..models import (
    TelemetryIngestPayload, 
    TelemetryResponse, 
    TelemetryHistoryResponse, 
    TelemetryHistoryPoint
)
from ..notifier.sms import send_msg91_safety_alert
from ..notifier.fcm import send_fcm_alert

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

# In-memory WebSocket broadcaster callback hook
_ws_broadcaster = None

def set_ws_broadcaster(broadcaster):
    global _ws_broadcaster
    _ws_broadcaster = broadcaster

async def broadcast_ws(message: dict):
    if _ws_broadcaster:
        await _ws_broadcaster(message)

# Incident state tracking
active_hazard_keys = set()
last_alert_dispatch_time: Dict[str, float] = {}

@router.post("", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(packet: TelemetryIngestPayload):
    settings = load_settings()
    ts = packet.timestamp or datetime.now(timezone.utc).isoformat()
    now_epoch = time.time()

    temp_val = packet.temperature
    hum_val = packet.humidity
    gas_val = packet.gas
    flame_val = 1 if (packet.flame == 1 or packet.flame is True) else 0

    # Determine Commanded Actuator States based on real safety logic
    commanded_buzzer = "OFF"
    commanded_relay = "OFF"

    is_flame = flame_val == 1
    is_gas_crit = gas_val is not None and gas_val >= settings.get("gasCriticalThreshold", 2800)
    is_gas_warn = gas_val is not None and gas_val >= settings.get("gasWarningThreshold", 1800)
    is_temp_crit = temp_val is not None and temp_val >= settings.get("tempCriticalThreshold", 45.0)
    is_temp_warn = temp_val is not None and temp_val >= settings.get("tempWarningThreshold", 35.0)

    # Actuator rules
    if is_flame or is_gas_crit:
        commanded_buzzer = "ON"
        commanded_relay = "ON"
    elif is_gas_warn or is_temp_crit:
        commanded_buzzer = "OFF"
        commanded_relay = "ON"
    elif is_temp_warn:
        commanded_relay = "ON"
    else:
        commanded_buzzer = "OFF"
        commanded_relay = "OFF"

    # Store in SQLite
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry (
            timestamp, device_id, temperature, humidity, gas_raw, flame, 
            relay_state, buzzer_state, rssi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ts, packet.device_id, temp_val, hum_val, gas_val, flame_val,
        commanded_relay, commanded_buzzer, packet.rssi
    ))

    # Evaluate Incidents and Alerts
    new_incidents_created = []

    # 1. Flame Hazard
    if is_flame and "flame" not in active_hazard_keys:
        active_hazard_keys.add("flame")
        inc_id = f"inc_flame_{int(now_epoch)}"
        cursor.execute("""
            INSERT INTO incidents (
                id, timestamp, last_observed_timestamp, title, description,
                zone, severity, status, event_type, source_device,
                triggering_value, threshold_value, telemetry_snapshot, notification_attempts
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inc_id, ts, ts, "Optical Flame Presence Detected",
            "KY-026 active-low optical infrared sensor triggered active flame state.",
            "Hazard Zone A", "critical", "open", "flame_detected", packet.device_id,
            "1 (Active Flame)", "0 (Clear)",
            json.dumps({"temperature": temp_val, "gas": gas_val, "flame": 1}),
            json.dumps([])
        ))
        new_incidents_created.append(inc_id)

    elif not is_flame and "flame" in active_hazard_keys:
        active_hazard_keys.discard("flame")
        # Auto-update status when hazard condition clears
        cursor.execute("""
            UPDATE incidents 
            SET last_observed_timestamp = ? 
            WHERE event_type = 'flame_detected' AND status = 'open'
        """, (ts,))

    # 2. Gas / Smoke Spike
    if is_gas_crit and "gas_crit" not in active_hazard_keys:
        active_hazard_keys.add("gas_crit")
        inc_id = f"inc_gas_crit_{int(now_epoch)}"
        cursor.execute("""
            INSERT INTO incidents (
                id, timestamp, last_observed_timestamp, title, description,
                zone, severity, status, event_type, source_device,
                triggering_value, threshold_value, telemetry_snapshot, notification_attempts
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inc_id, ts, ts, "Critical Gas / Smoke Level Spike",
            f"MQ-2 raw analog reading ({int(gas_val)}) exceeded critical ceiling threshold ({settings.get('gasCriticalThreshold', 2800)}).",
            "Hazard Zone A", "critical", "open", "gas_threshold", packet.device_id,
            f"{int(gas_val)} ADC", f"{settings.get('gasCriticalThreshold', 2800)} ADC",
            json.dumps({"gas": gas_val, "threshold": settings.get("gasCriticalThreshold")}),
            json.dumps([])
        ))
        new_incidents_created.append(inc_id)

    elif not is_gas_crit:
        active_hazard_keys.discard("gas_crit")

    # 3. Temperature Abnormality
    if is_temp_crit and "temp_crit" not in active_hazard_keys:
        active_hazard_keys.add("temp_crit")
        inc_id = f"inc_temp_{int(now_epoch)}"
        cursor.execute("""
            INSERT INTO incidents (
                id, timestamp, last_observed_timestamp, title, description,
                zone, severity, status, event_type, source_device,
                triggering_value, threshold_value, telemetry_snapshot, notification_attempts
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inc_id, ts, ts, "High Ambient Temperature Alarm",
            f"DHT11 temperature ({temp_val:.1f}°C) exceeded critical limit ({settings.get('tempCriticalThreshold')}°C).",
            "Hazard Zone A", "critical", "open", "temperature_threshold", packet.device_id,
            f"{temp_val:.1f}°C", f"{settings.get('tempCriticalThreshold')}°C",
            json.dumps({"temperature": temp_val}),
            json.dumps([])
        ))
        new_incidents_created.append(inc_id)

    elif not is_temp_crit:
        active_hazard_keys.discard("temp_crit")

    conn.commit()
    conn.close()

    # Broadcast Live Telemetry packet to WebSocket clients
    await broadcast_ws({
        "type": "TELEMETRY_UPDATE",
        "timestamp": ts,
        "data": {
            "device_id": packet.device_id,
            "source": "esp32",
            "is_hardware": True,
            "timestamp": ts,
            "temperature_c": temp_val,
            "humidity_rh": hum_val,
            "gas_ppm": gas_val,
            "gas_raw": gas_val,
            "gas_unit": "Raw ADC (Uncalibrated MQ-2)",
            "flame_detected": flame_val,
            "relay_state": commanded_relay,
            "buzzer_state": commanded_buzzer,
            "actuator_mode": "commanded",
            "rssi_dbm": packet.rssi
        }
    })

    if new_incidents_created:
        await broadcast_ws({
            "type": "INCIDENT_UPDATE",
            "timestamp": ts,
            "new_incident_ids": new_incidents_created
        })

    # Return response with commanded actuator states (ESP32 acts on this!)
    return {
        "status": "received",
        "timestamp": ts,
        "device_id": packet.device_id,
        "relay_state": commanded_relay,
        "buzzer_state": commanded_buzzer,
        "actuator_mode": "commanded"
    }

@router.get("/latest", response_model=TelemetryResponse)
def get_latest_telemetry():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT device_id, timestamp, temperature, humidity, gas_raw, flame, relay_state, buzzer_state, rssi 
        FROM telemetry ORDER BY id DESC LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No real hardware telemetry packets received yet"
        )

    return TelemetryResponse(
        device_id=row["device_id"],
        source="esp32",
        is_hardware=True,
        timestamp=row["timestamp"],
        temperature_c=row["temperature"],
        humidity_rh=row["humidity"],
        gas_ppm=row["gas_raw"],
        gas_raw=row["gas_raw"],
        flame_detected=row["flame"],
        relay_state=row["relay_state"] or "OFF",
        buzzer_state=row["buzzer_state"] or "OFF",
        rssi_dbm=row["rssi"]
    )

@router.get("", response_model=TelemetryResponse)
def get_current_telemetry():
    """Alias for GET /api/telemetry returning latest reading."""
    return get_latest_telemetry()

@router.get("/history", response_model=TelemetryHistoryResponse)
def get_telemetry_history(
    range: str = Query("1h", pattern="^(1h|6h|24h|7d)$"),
    limit: int = Query(60, ge=1, le=200)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, temperature, humidity, gas_raw, flame 
        FROM telemetry ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    history = [
        TelemetryHistoryPoint(
            timestamp=r["timestamp"],
            temperature=r["temperature"],
            humidity=r["humidity"],
            gas=r["gas_raw"],
            flame=r["flame"]
        )
        for r in reversed(rows)
    ]

    return TelemetryHistoryResponse(
        range=range,
        count=len(history),
        history=history
    )
