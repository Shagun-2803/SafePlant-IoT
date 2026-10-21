"""
SafePlant AIoT — Settings Router
Persistent threshold configuration and alert channel preferences.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from ..database import load_settings, save_settings
from .telemetry import broadcast_ws

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=Dict[str, Any])
def get_settings():
    return load_settings()

@router.put("", response_model=Dict[str, Any])
@router.post("", response_model=Dict[str, Any])
async def update_settings(updates: Dict[str, Any]):
    current = load_settings()

    # Validation: Warning threshold must not exceed Critical threshold
    temp_warn = updates.get("tempWarningThreshold", current.get("tempWarningThreshold"))
    temp_crit = updates.get("tempCriticalThreshold", current.get("tempCriticalThreshold"))
    if temp_warn is not None and temp_crit is not None and temp_warn >= temp_crit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Temperature warning threshold ({temp_warn}°C) must be strictly less than critical threshold ({temp_crit}°C)"
        )

    gas_warn = updates.get("gasWarningThreshold", current.get("gasWarningThreshold"))
    gas_crit = updates.get("gasCriticalThreshold", current.get("gasCriticalThreshold"))
    if gas_warn is not None and gas_crit is not None and gas_warn >= gas_crit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gas warning threshold ({gas_warn}) must be strictly less than critical threshold ({gas_crit})"
        )

    for k, v in updates.items():
        current[k] = v

    save_settings(current)
    await broadcast_ws({"type": "SETTINGS_UPDATE", "settings": current})
    return current
