"""
SafePlant AIoT — Pydantic Request & Response Schemas
Matches both real ESP32 JSON payloads and Android Retrofit models.
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, model_validator
from datetime import datetime, timezone

class TelemetryIngestPayload(BaseModel):
    """
    Accepts telemetry from ESP32 firmware and Android simulator.
    Normalizes field aliases into canonical names.
    """
    device_id: Optional[str] = "ESP32_SAFEPLANT_GATEWAY_01"
    temperature: Optional[float] = None
    temperature_c: Optional[float] = None
    humidity: Optional[float] = None
    humidity_rh: Optional[float] = None
    gas: Optional[float] = None
    gas_raw: Optional[float] = None
    flame: Optional[Union[int, bool]] = None
    flame_detected: Optional[Union[int, bool]] = None
    relay: Optional[str] = None
    relay_state: Optional[str] = None
    buzzer: Optional[str] = None
    buzzer_state: Optional[str] = None
    rssi: Optional[int] = None
    rssi_dbm: Optional[int] = None
    timestamp: Optional[str] = None

    @model_validator(mode="after")
    def normalize_fields(self):
        # Temperature
        if self.temperature is None and self.temperature_c is not None:
            self.temperature = self.temperature_c
        elif self.temperature_c is None and self.temperature is not None:
            self.temperature_c = self.temperature

        # Humidity
        if self.humidity is None and self.humidity_rh is not None:
            self.humidity = self.humidity_rh
        elif self.humidity_rh is None and self.humidity is not None:
            self.humidity_rh = self.humidity

        # Gas (Uncalibrated raw 12-bit ADC)
        if self.gas is None and self.gas_raw is not None:
            self.gas = self.gas_raw
        elif self.gas_raw is None and self.gas is not None:
            self.gas_raw = self.gas

        # Flame
        if self.flame is None and self.flame_detected is not None:
            self.flame = 1 if self.flame_detected else 0
        elif self.flame_detected is None and self.flame is not None:
            self.flame_detected = bool(self.flame)

        # Actuators
        if not self.relay_state and self.relay:
            self.relay_state = self.relay
        elif not self.relay_state:
            self.relay_state = "OFF"

        if not self.buzzer_state and self.buzzer:
            self.buzzer_state = self.buzzer
        elif not self.buzzer_state:
            self.buzzer_state = "OFF"

        # RSSI
        if self.rssi is None and self.rssi_dbm is not None:
            self.rssi = self.rssi_dbm
        elif self.rssi is None:
            self.rssi = -64

        # Timestamp
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

        return self

class TelemetryResponse(BaseModel):
    device_id: str
    source: str = "esp32"
    is_hardware: bool = True
    timestamp: str
    temperature_c: Optional[float]
    humidity_rh: Optional[float]
    gas_ppm: Optional[float] # Raw 12-bit ADC value
    gas_raw: Optional[float]
    gas_unit: str = "Raw ADC (Uncalibrated MQ-2)"
    flame_detected: Optional[int]
    relay_state: str
    buzzer_state: str
    actuator_mode: str = "commanded"
    rssi_dbm: Optional[int]

class TelemetryHistoryPoint(BaseModel):
    timestamp: str
    temperature: Optional[float]
    humidity: Optional[float]
    gas: Optional[float]
    flame: Optional[int]

class TelemetryHistoryResponse(BaseModel):
    range: str
    count: int
    history: List[TelemetryHistoryPoint]

class IncidentAcknowledgeRequest(BaseModel):
    acknowledgedBy: Optional[str] = "Plant Safety Officer"

class IncidentResolveRequest(BaseModel):
    notes: Optional[str] = "Hazard inspected and normal operations confirmed."

class IncidentRecordModel(BaseModel):
    id: str
    timestamp: str
    lastObservedTimestamp: Optional[str] = None
    title: str
    description: str
    zone: str = "Hazard Zone A"
    severity: str # 'low' | 'medium' | 'critical'
    status: str # 'open' | 'acknowledged' | 'resolved'
    eventType: str
    sourceDevice: str
    triggeringValue: Optional[str] = None
    thresholdValue: Optional[str] = None
    telemetrySnapshot: Optional[Dict[str, Any]] = None
    cameraDetails: Optional[Dict[str, Any]] = None
    notificationAttempts: List[Dict[str, Any]] = []
    acknowledged: bool = False
    resolved: bool = False
    acknowledgedAt: Optional[str] = None
    acknowledgedBy: Optional[str] = None
    resolvedAt: Optional[str] = None
    resolutionNotes: Optional[str] = None

class AiEventPayload(BaseModel):
    polygon_id: str
    people_count: int = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: Optional[str] = None
    idempotency_key: Optional[str] = None
    source: Optional[str] = "android_camera"
    is_hardware: Optional[bool] = False

class FcmTokenRegistrationPayload(BaseModel):
    token: str
    deviceId: Optional[str] = "android-device"
    platform: Optional[str] = "android"
