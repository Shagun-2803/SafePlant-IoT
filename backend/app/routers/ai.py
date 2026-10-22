"""
SafePlant AIoT — Edge AI & CameraX Intrusion Router
Handles on-device person detection events inside restricted perimeter zones.
"""
import time
import json
from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status

from ..database import get_connection, load_settings
from ..models import AiEventPayload
from .telemetry import broadcast_ws

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Intrusion cooldown cache: polygon_id -> last_alert_epoch
last_intrusion_dispatch: Dict[str, float] = {}

@router.get("/status")
def get_ai_status():
    return {
        "status": "active",
        "model": "CameraX ML Kit Object Detection (Person)",
        "mode": "on-device edge inference",
        "restricted_polygons_count": 1,
        "cooldown_active": any(time.time() - t < 15 for t in last_intrusion_dispatch.values()),
        "last_event_timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/events")
def get_ai_events():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, title, description, severity, status, triggering_value, camera_details
        FROM incidents 
        WHERE event_type = 'camera_intrusion'
        ORDER BY timestamp DESC LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "timestamp": r["timestamp"],
            "title": r["title"],
            "description": r["description"],
            "severity": r["severity"],
            "status": r["status"],
            "triggering_value": r["triggering_value"],
            "camera_details": json.loads(r["camera_details"]) if r["camera_details"] else {}
        }
        for r in rows
    ]

@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_ai_event(event: AiEventPayload):
    settings = load_settings()
    cooldown_sec = settings.get("intrusionReminderCooldownSec", 15)
    now_epoch = time.time()
    now_iso = event.timestamp or datetime.now(timezone.utc).isoformat()

    last_time = last_intrusion_dispatch.get(event.polygon_id, 0)
    if (now_epoch - last_time) < cooldown_sec and event.people_count > 0:
        return {
            "status": "rate_limited",
            "message": f"Intrusion alert rate-limited by {cooldown_sec}s cooldown",
            "cooldown_remaining_sec": int(cooldown_sec - (now_epoch - last_time))
        }

    last_intrusion_dispatch[event.polygon_id] = now_epoch

    inc_id = f"inc_intrusion_{int(now_epoch)}"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO incidents (
            id, timestamp, last_observed_timestamp, title, description,
            zone, severity, status, event_type, source_device,
            triggering_value, threshold_value, camera_details, notification_attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        inc_id,
        now_iso,
        now_iso,
        f"Restricted Perimeter Breach — {event.polygon_id.upper()}",
        f"CameraX on-device detector identified {event.people_count} person(s) inside restricted polygon (Confidence: {int(event.confidence * 100)}%).",
        event.polygon_id,
        "critical" if event.people_count > 0 else "low",
        "open",
        "camera_intrusion",
        event.source or "android_camera",
        f"{event.people_count} person(s) ({int(event.confidence * 100)}% conf)",
        "0 persons in restricted zone",
        json.dumps({
            "polygon_id": event.polygon_id,
            "people_count": event.people_count,
            "confidence": event.confidence,
            "source": event.source or "android_camera",
            "is_hardware": bool(event.is_hardware)
        }),
        json.dumps([])
    ))
    conn.commit()
    conn.close()

    await broadcast_ws({
        "type": "INCIDENT_UPDATE",
        "timestamp": now_iso,
        "incidentId": inc_id,
        "eventType": "camera_intrusion"
    })

    return {
        "status": "recorded",
        "incident_id": inc_id,
        "timestamp": now_iso,
        "cooldown_sec": cooldown_sec
    }
