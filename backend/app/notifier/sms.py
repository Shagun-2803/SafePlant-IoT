"""
SafePlant AIoT — SMS Dispatcher (MSG91 for India)
"""
import os
import requests
from typing import Dict, Any, Optional

def send_msg91_safety_alert(
    mobile_number: str,
    event_type: str,
    location: str,
    severity: str,
    metric_value: str
) -> Dict[str, Any]:
    auth_key = os.getenv("MSG91_AUTH_KEY")
    template_id = os.getenv("MSG91_TEMPLATE_ID")
    sender_id = os.getenv("MSG91_SENDER_ID", "SAFEPL")

    clean_mobile = mobile_number.replace(" ", "").replace("-", "")
    if clean_mobile.startswith("+"):
        clean_mobile = clean_mobile[1:]
    if not clean_mobile.startswith("91") and len(clean_mobile) == 10:
        clean_mobile = "91" + clean_mobile

    if not auth_key or not template_id:
        return {
            "channel": "sms",
            "delivered": False,
            "status": "not_configured",
            "error": "MSG91 credentials missing. Set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in environment."
        }

    url = "https://control.msg91.com/api/v5/flow/"
    headers = {
        "authkey": auth_key,
        "content-type": "application/json",
        "accept": "application/json"
    }
    payload = {
        "template_id": template_id,
        "sender": sender_id,
        "short_url": "0",
        "recipients": [
            {
                "mobiles": clean_mobile,
                "VAR1": event_type,
                "VAR2": location,
                "VAR3": severity.upper(),
                "VAR4": metric_value
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        res_data = response.json() if response.status_code == 200 else {}
        is_success = response.status_code == 200 and res_data.get("type") == "success"

        return {
            "channel": "sms",
            "delivered": is_success,
            "status": "accepted" if is_success else "failed",
            "providerMessageId": res_data.get("message"),
            "error": None if is_success else f"HTTP {response.status_code}: {response.text}"
        }
    except Exception as e:
        return {
            "channel": "sms",
            "delivered": False,
            "status": "failed",
            "error": str(e)
        }
