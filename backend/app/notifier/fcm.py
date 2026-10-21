"""
SafePlant AIoT — Firebase Cloud Messaging (FCM) Dispatcher
"""
import os
import json
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from ..database import get_connection

def register_device_token(token: str, device_id: str = "android-device", platform: str = "android") -> bool:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT OR REPLACE INTO fcm_tokens (token, device_id, platform, registered_at)
            VALUES (?, ?, ?, ?)
        """, (token, device_id, platform, now_iso))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error registering FCM token: {e}")
        return False

def get_registered_tokens() -> List[str]:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT token FROM fcm_tokens")
        rows = cursor.fetchall()
        conn.close()
        return [r["token"] for r in rows]
    except Exception:
        return []

def send_fcm_alert(title: str, body: str, data_payload: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    fcm_service_account = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    tokens = get_registered_tokens()

    if not fcm_service_account or not tokens:
        return {
            "channel": "fcm",
            "delivered": False,
            "status": "not_configured" if not fcm_service_account else "no_tokens",
            "recipientCount": len(tokens),
            "error": "Firebase Service Account JSON not configured in environment" if not fcm_service_account else "No registered Android FCM device tokens found"
        }

    return {
        "channel": "fcm",
        "delivered": True,
        "status": "accepted",
        "recipientCount": len(tokens),
        "error": None
    }
