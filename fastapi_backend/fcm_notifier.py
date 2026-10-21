"""
Firebase Cloud Messaging (FCM) Dispatcher for SafePlant AIoT.
Uses Firebase Admin SDK to dispatch high-priority push alerts to registered Android devices.
"""

import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger("safeplant.fcm")

REGISTERED_TOKENS: set = set()

def register_device_token(token: str):
    if token and len(token) > 10:
        REGISTERED_TOKENS.add(token)
        logger.info(f"Registered FCM device token: {token[:12]}...")

def send_fcm_alert(incident: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends Android high-priority FCM notification to all registered tokens.
    """
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not service_account_path or not os.path.exists(service_account_path):
        return {
            "channel": "fcm",
            "status": "not_configured",
            "error": "FIREBASE_SERVICE_ACCOUNT_JSON not set or file does not exist",
            "incident_id": incident.get("id")
        }

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)

        if not REGISTERED_TOKENS:
            return {
                "channel": "fcm",
                "status": "queued",
                "note": "No active device tokens registered with backend yet",
                "incident_id": incident.get("id")
            }

        severity = incident.get("severity", "CRITICAL").upper()
        title = f"EMERGENCY: {incident.get('title', 'Hazard Detected')}"
        body = incident.get("description", "Exceeded plant safety threshold.")

        android_config = messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                title=title,
                body=body,
                icon="ic_safeplant_shield",
                color="#10E575",
                sound="default",
                channel_id="safeplant_critical_channel" if severity == "CRITICAL" else "safeplant_warning_channel"
            )
        )

        success_count = 0
        for token in list(REGISTERED_TOKENS):
            message = messaging.Message(
                token=token,
                data={
                    "incident_id": str(incident.get("id", "")),
                    "title": title,
                    "message": body,
                    "severity": severity,
                    "zone": str(incident.get("zone", "Refinery Cell A-4"))
                },
                android=android_config
            )
            try:
                messaging.send(message)
                success_count += 1
            except Exception as e:
                logger.error(f"FCM dispatch error to token: {e}")

        return {
            "channel": "fcm",
            "status": "delivered" if success_count > 0 else "failed",
            "tokens_dispatched": success_count,
            "incident_id": incident.get("id")
        }
    except Exception as e:
        logger.error(f"FCM initialization or send error: {e}")
        return {
            "channel": "fcm",
            "status": "failed",
            "error": str(e),
            "incident_id": incident.get("id")
        }
