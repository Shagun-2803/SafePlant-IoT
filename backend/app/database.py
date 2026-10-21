"""
SafePlant AIoT — Persistent SQLite Database Layer
Stores real telemetry packets, incident audit records, and persistent threshold settings.
"""
import os
import json
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

DB_PATH = os.getenv("SAFEPLANT_DB_PATH", "backend/safeplant.db")

DEFAULT_SETTINGS: Dict[str, Any] = {
    "tempWarningThreshold": 35.0,
    "tempCriticalThreshold": 45.0,
    "gasWarningThreshold": 1800,
    "gasCriticalThreshold": 2800,
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
    "smsNotificationsEnabled": False,
    "deviceId": "ESP32_SAFEPLANT_GATEWAY_01"
}

def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
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
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id)")

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

    # 4. FCM Tokens Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fcm_tokens (
        token TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        platform TEXT DEFAULT 'android',
        registered_at TEXT NOT NULL
    )
    """)

    # Seed initial default settings if empty
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        for k, v in DEFAULT_SETTINGS.items():
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))

    conn.commit()
    conn.close()

def load_settings() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()

    result = DEFAULT_SETTINGS.copy()
    for row in rows:
        key = row["key"]
        raw = row["value"]
        try:
            result[key] = json.loads(raw)
        except Exception:
            result[key] = raw
    return result

def save_settings(new_settings: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    for k, v in new_settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))
    conn.commit()
    conn.close()
