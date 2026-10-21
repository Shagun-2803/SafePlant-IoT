"""
SafePlant AIoT — Automated Backend Test Suite
Validates all endpoints, SQLite persistence, threshold logic, and error cases.
"""
import os
import pytest
from fastapi.testclient import TestClient

# Use temporary test database
os.environ["SAFEPLANT_DB_PATH"] = "backend/test_safeplant.db"

from backend.app.main import app
from backend.app.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    if os.path.exists("backend/test_safeplant.db"):
        os.remove("backend/test_safeplant.db")
    init_db()
    yield
    if os.path.exists("backend/test_safeplant.db"):
        try:
            os.remove("backend/test_safeplant.db")
        except Exception:
            pass

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_status_initial_disconnected():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "disconnected"
    assert data["hardware_connected"] is False

def test_telemetry_latest_empty_404():
    response = client.get("/api/telemetry/latest")
    assert response.status_code == 404
    assert "No real hardware telemetry packets received yet" in response.json()["detail"]

def test_telemetry_ingest_and_latest():
    payload = {
        "device_id": "ESP32_TEST_01",
        "temperature": 27.5,
        "humidity": 55.0,
        "gas": 1200.0,
        "flame": 0,
        "rssi": -65
    }
    post_resp = client.post("/api/telemetry", json=payload)
    assert post_resp.status_code == 201
    post_data = post_resp.json()
    assert post_data["status"] == "received"
    assert post_data["relay_state"] == "OFF"
    assert post_data["buzzer_state"] == "OFF"

    # Now latest must return 200
    get_resp = client.get("/api/telemetry/latest")
    assert get_resp.status_code == 200
    lat_data = get_resp.json()
    assert lat_data["device_id"] == "ESP32_TEST_01"
    assert lat_data["temperature_c"] == 27.5
    assert lat_data["humidity_rh"] == 55.0
    assert lat_data["gas_ppm"] == 1200.0
    assert lat_data["flame_detected"] == 0

def test_flame_detection_triggers_critical_incident_and_buzzer():
    payload = {
        "device_id": "ESP32_TEST_01",
        "temperature": 32.0,
        "humidity": 45.0,
        "gas": 1100.0,
        "flame": 1,
        "rssi": -62
    }
    resp = client.post("/api/telemetry", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["buzzer_state"] == "ON"
    assert data["relay_state"] == "ON"

    # Verify incident was created
    incidents_resp = client.get("/api/incidents")
    assert incidents_resp.status_code == 200
    incidents = incidents_resp.json()
    assert len(incidents) >= 1
    flame_inc = next((i for i in incidents if i["eventType"] == "flame_detected"), None)
    assert flame_inc is not None
    assert flame_inc["severity"] == "critical"
    assert flame_inc["status"] == "open"

def test_gas_spike_triggers_incident_and_actuators():
    payload = {
        "device_id": "ESP32_TEST_01",
        "temperature": 26.0,
        "humidity": 50.0,
        "gas": 3200.0, # Above critical threshold of 2800
        "flame": 0
    }
    resp = client.post("/api/telemetry", json=payload)
    assert resp.status_code == 201
    assert resp.json()["buzzer_state"] == "ON"
    assert resp.json()["relay_state"] == "ON"

    incidents = client.get("/api/incidents").json()
    gas_inc = next((i for i in incidents if i["eventType"] == "gas_threshold"), None)
    assert gas_inc is not None
    assert gas_inc["severity"] == "critical"

def test_incident_acknowledge_and_resolve_lifecycle():
    # Trigger an incident
    client.post("/api/telemetry", json={"flame": 1, "temperature": 25.0, "humidity": 50.0, "gas": 900.0})
    incidents = client.get("/api/incidents").json()
    assert len(incidents) > 0
    inc_id = incidents[0]["id"]

    # Acknowledge
    ack_resp = client.post(f"/api/incidents/{inc_id}/acknowledge", json={"acknowledgedBy": "Safety Officer Jane"})
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Resolve
    res_resp = client.post(f"/api/incidents/{inc_id}/resolve", json={"notes": "Flame cleared and area ventilated."})
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"

    # Verify status in database
    updated = client.get("/api/incidents").json()
    matched = next(i for i in updated if i["id"] == inc_id)
    assert matched["status"] == "resolved"
    assert matched["acknowledged"] is True
    assert matched["resolved"] is True
    assert matched["resolutionNotes"] == "Flame cleared and area ventilated."

def test_settings_validation():
    # Warning threshold >= critical threshold must be rejected with 422
    invalid_payload = {
        "tempWarningThreshold": 55.0,
        "tempCriticalThreshold": 50.0
    }
    resp = client.put("/api/settings", json=invalid_payload)
    assert resp.status_code == 422

    # Valid payload must succeed
    valid_payload = {
        "tempWarningThreshold": 38.0,
        "tempCriticalThreshold": 48.0
    }
    resp_valid = client.put("/api/settings", json=valid_payload)
    assert resp_valid.status_code == 200
    assert resp_valid.json()["tempWarningThreshold"] == 38.0

def test_ai_camerax_intrusion_event():
    ai_event = {
        "polygon_id": "zone_restricted_1",
        "people_count": 1,
        "confidence": 0.88
    }
    resp = client.post("/api/ai/events", json=ai_event)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "recorded"
    assert "incident_id" in data

    # Verify incident created
    incidents = client.get("/api/incidents").json()
    intrusion_inc = next((i for i in incidents if i["eventType"] == "camera_intrusion"), None)
    assert intrusion_inc is not None
    assert intrusion_inc["severity"] == "critical"
