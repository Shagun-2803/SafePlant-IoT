export type SystemSafetyState = 'NOMINAL' | 'WARNING' | 'CRITICAL' | 'DISCONNECTED' | 'STALE_DATA';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'STALE_DATA' | 'DISCONNECTED' | 'CONNECTING' | 'NO_DATA';

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

export interface NotificationAttempt {
  channel: 'fcm' | 'sms';
  timestamp: string;
  status: 'queued' | 'accepted' | 'failed' | 'delivered' | 'not_configured';
  providerMessageId?: string;
  error?: string;
  retryCount?: number;
}

export interface FcmTokenRegistrationPayload {
  device_id: string;
  fcm_token: string;
  platform: 'android';
  app_version: string;
  registered_at: string;
}

export interface SensorReading {
  id: string;
  name: string;
  category: 'temperature' | 'humidity' | 'gas' | 'flame' | 'pressure' | 'vibration';
  value: number | null; // null represents UNKNOWN / missing data
  unit: string;
  minRange: number;
  maxRange: number;
  warningThreshold: number;
  criticalThreshold: number;
  status: 'optimal' | 'warning' | 'critical' | 'unknown';
  trend: 'rising' | 'falling' | 'stable';
  history: (number | null)[];
  hardwarePin: string;
  signalDbm: number;
  lastUpdated: string;
  deviceTimestamp?: string;
  source?: 'esp32' | 'vision' | 'unknown';
  calibrationStatus?: 'raw' | 'estimated' | 'calibrated';
}

export interface PolygonVertex {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

export interface RestrictedZonePolygon {
  id: string;
  name: string;
  vertices: PolygonVertex[];
  enabled: boolean;
  cooldownSeconds: number;
  exitConfirmationSeconds: number;
}

export interface AiDetection {
  id: string;
  timestamp: string;
  type: 'person' | 'restricted_zone' | 'smoke' | 'flame' | 'thermal';
  label: string;
  confidence: number;
  zone: string;
  status: 'compliant' | 'warning' | 'alert';
  box?: {
    x: number; // percentage (0-100)
    y: number;
    w: number;
    h: number;
  };
  isInsidePolygon?: boolean;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  lastObservedTimestamp?: string;
  title: string;
  description: string;
  zone: string;
  severity: 'low' | 'medium' | 'critical';
  status: IncidentStatus;
  eventType: 'temperature_threshold' | 'gas_threshold' | 'flame_detected' | 'humidity_abnormality' | 'camera_intrusion' | 'device_disconnected' | 'general';
  sourceDevice: string;
  triggeringValue?: string;
  thresholdValue?: string;
  telemetrySnapshot?: {
    temperature?: number | null;
    humidity?: number | null;
    gas?: number | null;
    flame?: boolean | number | null;
  };
  cameraDetails?: {
    regionId: string;
    peopleCount: number;
    confidence?: number;
  };
  notificationAttempts: NotificationAttempt[];
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface EmergencyAlert {
  id: string;
  incidentId: string;
  title: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  sensorSource: string;
  actualMetric: string;
  timestamp: string;
  zone: string;
  safetyInstructions: string[];
  acknowledged: boolean;
}

export interface DeviceConfig {
  fastApiUrl: string;
  deviceId: string;
  firmwareVersion: string;
  pollingIntervalMs: number;
  reducedMotion: boolean;
  hapticFeedback: boolean;
  temperatureUnit: 'C' | 'F';
  webSocketEnabled: boolean;
  fcmToken: string | null;
  notificationsEnabled: boolean;
  // Section 7 required settings:
  tempWarningThreshold: number;
  tempCriticalThreshold: number;
  gasWarningThreshold: number;
  gasCriticalThreshold: number;
  humidityWarningThreshold: number | null;
  humidityCriticalThreshold: number | null;
  flameEventEnabled: boolean;
  tempNotificationsEnabled: boolean;
  gasNotificationsEnabled: boolean;
  humidityNotificationsEnabled: boolean;
  flameNotificationsEnabled: boolean;
  intrusionAlertEnabled: boolean;
  intrusionReminderCooldownSec: number;
  exitConfirmationSec: number;
  telemetryStaleTimeoutSec: number;
  smsDestinationNumber: string;
  fcmNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

export interface TelemetryHistoryPoint {
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  gas: number | null;
  flame: number | null;
}

export interface TelemetryPayloadDto {
  device_id: string;
  source: 'esp32' | 'simulation';
  is_hardware: boolean;
  timestamp: string; // ISO 8601 device timestamp
  temperature_c?: number | null;
  humidity_rh?: number | null;
  gas_ppm?: number | null;
  flame_detected?: boolean | number | null;
  pressure_bar?: number | null;
  vibration_index?: number | null;
  relay_state?: 'ON' | 'OFF' | 'UNKNOWN';
  buzzer_state?: 'ON' | 'OFF' | 'UNKNOWN';
  actuator_mode?: 'commanded' | 'confirmed';
  rssi_dbm?: number;
  battery_volts?: number;
}

export interface BackendStatusResponse {
  status: string;
  hardware_connected: boolean;
  esp32_last_seen: string | null;
  active_sensors_count: number;
  firmware_version?: string;
  rssi?: number;
  relay_state?: 'ON' | 'OFF' | 'UNKNOWN';
  buzzer_state?: 'ON' | 'OFF' | 'UNKNOWN';
  actuator_mode?: 'commanded' | 'confirmed';
  gas_unit?: string;
  fcm_configured?: boolean;
  sms_configured?: boolean;
  last_error?: string | null;
}

export interface WebSocketMessage {
  type: 'INITIAL_SNAPSHOT' | 'TELEMETRY_UPDATE' | 'CONNECTION_STATUS' | 'HEARTBEAT' | 'EMERGENCY_ALERT' | 'INCIDENT_UPDATE' | string;
  timestamp?: string;
  data?: TelemetryPayloadDto;
  payload?: any;
  status?: string;
  incidents?: IncidentRecord[];
  alert?: EmergencyAlert;
}
