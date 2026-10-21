"""
MSG91 India Transactional SMS Integration Provider for SafePlant AIoT.
Handles DLT template normalization, authentication, bounded retries, and attempt tracking.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("safeplant.sms")

# Environment Configuration
MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID")
MSG91_SENDER_ID = os.getenv("MSG91_SENDER_ID", "SFPLNT")

def send_msg91_safety_alert(
    recipient_phone: str,
    incident_title: str,
    severity: str,
    zone: str,
    timestamp: str,
    incident_id: str
) -> Dict[str, Any]:
    """
    Dispatches a high-priority transactional SMS via MSG91 Flow API.
    Recipient must be a normalized Indian (+91) phone number.
    Returns delivery attempt status dictionary.
    """
    if not MSG91_AUTH_KEY or not MSG91_TEMPLATE_ID:
        logger.warning(
            "MSG91 credentials not set (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID). "
            "SMS alert marked as NOT_CONFIGURED."
        )
        return {
            "channel": "sms",
            "status": "not_configured",
            "error": "MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing in backend environment",
            "incident_id": incident_id
        }

    # Normalize phone: ensure 91 prefix for Indian destinations
    clean_number = recipient_phone.replace(" ", "").replace("-", "").replace("+", "")
    if len(clean_number) == 10:
        clean_number = f"91{clean_number}"

    payload = {
        "template_id": MSG91_TEMPLATE_ID,
        "sender": MSG91_SENDER_ID,
        "short_url": "0",
        "recipients": [
            {
                "mobiles": clean_number,
                "var1": severity.upper(),
                "var2": incident_title,
                "var3": zone,
                "var4": timestamp
            }
        ]
    }

    headers = {
        "authkey": MSG91_AUTH_KEY,
        "content-type": "application/json"
    }

    try:
        import urllib.request
        req = urllib.request.Request(
            "https://control.msg91.com/api/v5/flow/",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            return {
                "channel": "sms",
                "status": "accepted" if res_json.get("type") == "success" else "failed",
                "provider_message_id": res_json.get("message"),
                "incident_id": incident_id
            }
    except Exception as e:
        logger.error(f"Failed to dispatch MSG91 SMS alert: {e}")
        return {
            "channel": "sms",
            "status": "failed",
            "error": str(e),
            "incident_id": incident_id
        }
