"""
SafePlant AIoT — Incidents Router
Manages safety abnormal incident lifecycles, auditing, acknowledgement, and resolution.
"""
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Query

from ..database import get_connection
from ..models import (
    IncidentRecordModel, 
    IncidentAcknowledgeRequest, 
    IncidentResolveRequest
)
from .telemetry import broadcast_ws

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.get("", response_model=List[IncidentRecordModel])
def list_incidents(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 200")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(IncidentRecordModel(
            id=r["id"],
            timestamp=r["timestamp"],
            lastObservedTimestamp=r["last_observed_timestamp"],
            title=r["title"],
            description=r["description"],
            zone=r["zone"] or "Hazard Zone A",
            severity=r["severity"],
            status=r["status"],
            eventType=r["event_type"],
            sourceDevice=r["source_device"],
            triggeringValue=r["triggering_value"],
            thresholdValue=r["threshold_value"],
            telemetrySnapshot=json.loads(r["telemetry_snapshot"]) if r["telemetry_snapshot"] else None,
            cameraDetails=json.loads(r["camera_details"]) if r["camera_details"] else None,
            notificationAttempts=json.loads(r["notification_attempts"]) if r["notification_attempts"] else [],
            acknowledged=bool(r["acknowledged"]),
            resolved=bool(r["resolved"]),
            acknowledgedAt=r["acknowledged_at"],
            acknowledgedBy=r["acknowledged_by"],
            resolvedAt=r["resolved_at"],
            resolutionNotes=r["resolution_notes"]
        ))

    if status and status != "all":
        results = [i for i in results if i.status == status]
    if severity and severity != "all":
        results = [i for i in results if i.severity == severity]

    return results

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_incident(payload: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    inc_id = payload.get("id") or f"inc_manual_{int(datetime.now().timestamp())}"

    cursor.execute("""
        INSERT INTO incidents (
            id, timestamp, last_observed_timestamp, title, description,
            zone, severity, status, event_type, source_device,
            triggering_value, threshold_value, telemetry_snapshot, notification_attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        inc_id,
        payload.get("timestamp") or now_iso,
        payload.get("lastObservedTimestamp") or now_iso,
        payload.get("title", "Safety Abnormality"),
        payload.get("description", "Safety threshold breach recorded"),
        payload.get("zone", "Hazard Zone A"),
        payload.get("severity", "medium"),
        payload.get("status", "open"),
        payload.get("eventType", "general"),
        payload.get("sourceDevice", "android-client"),
        payload.get("triggeringValue"),
        payload.get("thresholdValue"),
        json.dumps(payload.get("telemetrySnapshot", {})),
        json.dumps(payload.get("notificationAttempts", []))
    ))
    conn.commit()
    conn.close()

    await broadcast_ws({"type": "INCIDENT_UPDATE", "timestamp": now_iso, "incidentId": inc_id})
    return {"status": "created", "id": inc_id}

@router.patch("/{incident_id}/acknowledge")
@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: str, payload: IncidentAcknowledgeRequest = IncidentAcknowledgeRequest()):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM incidents WHERE id = ?", (incident_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    cursor.execute("""
        UPDATE incidents 
        SET status = 'acknowledged', acknowledged = 1, acknowledged_at = ?, acknowledged_by = ?
        WHERE id = ?
    """, (now_iso, payload.acknowledgedBy or "Safety Officer", incident_id))
    conn.commit()
    conn.close()

    await broadcast_ws({"type": "INCIDENT_UPDATE", "timestamp": now_iso, "incidentId": incident_id, "status": "acknowledged"})
    return {"status": "acknowledged", "id": incident_id, "acknowledgedAt": now_iso}

@router.patch("/{incident_id}/resolve")
@router.post("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, payload: IncidentResolveRequest = IncidentResolveRequest()):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM incidents WHERE id = ?", (incident_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    cursor.execute("""
        UPDATE incidents 
        SET status = 'resolved', resolved = 1, resolved_at = ?, resolution_notes = ?
        WHERE id = ?
    """, (now_iso, payload.notes or "Inspected and resolved.", incident_id))
    conn.commit()
    conn.close()

    await broadcast_ws({"type": "INCIDENT_UPDATE", "timestamp": now_iso, "incidentId": incident_id, "status": "resolved"})
    return {"status": "resolved", "id": incident_id, "resolvedAt": now_iso}
