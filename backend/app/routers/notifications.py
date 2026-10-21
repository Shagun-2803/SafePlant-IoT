"""
SafePlant AIoT — Notifications Router
FCM device token registration and test dispatch endpoints.
"""
from fastapi import APIRouter
from ..models import FcmTokenRegistrationPayload
from ..notifier.fcm import register_device_token, send_fcm_alert
from ..notifier.sms import send_msg91_safety_alert
from ..database import load_settings

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/register-token")
def register_token(payload: FcmTokenRegistrationPayload):
    ok = register_device_token(
        token=payload.token,
        device_id=payload.deviceId or "android-device",
        platform=payload.platform or "android"
    )
    return {"status": "registered" if ok else "error", "success": ok}

@router.post("/test-fcm")
def test_fcm():
    result = send_fcm_alert(
        title="SafePlant Safety Test Alert",
        body="Verification push notification from SafePlant FastAPI backend."
    )
    return result

@router.post("/test-sms")
def test_sms():
    settings = load_settings()
    dest = settings.get("smsDestinationNumber", "+91 98765 43210")
    result = send_msg91_safety_alert(
        mobile_number=dest,
        event_type="Test Alert",
        location="Zone A",
        severity="INFO",
        metric_value="Verification"
    )
    return result
