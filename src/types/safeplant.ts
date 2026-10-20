export type SystemSafetyState = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'STALE_DATA' | 'DISCONNECTED' | 'CONNECTING' | 'NO_DATA';

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
}

export interface RestrictedZoneBoundary {
  id: string;
  name: string;
  x: number; // percentage of viewport (0-100)
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  cooldownSeconds: number;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  zone: string;
  severity: 'low' | 'medium' | 'critical';
  sensorTrigger?: string;
  peakValue?: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  sourceType?: 'sensor' | 'camera_vision' | 'backend_ai';
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
}

export interface FcmTokenRegistrationPayload {
  device_id: string;
  fcm_token: string;
  platform: 'android';
  app_version: string;
  registered_at: string;
}

// FastAPI DTOs
export interface BackendHealthResponse {
  status: string;
  uptime_seconds?: number;
  service?: string;
  version?: string;
}

export interface BackendStatusResponse {
  status: string;
  hardware_connected: boolean;
  esp32_last_seen: string | null;
  active_sensors_count: number;
  firmware_version?: string;
  rssi?: number;
  fcm_configured?: boolean;
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
  rssi_dbm?: number;
  battery_volts?: number;
}

export interface WebSocketMessage {
  type: 'INITIAL_SNAPSHOT' | 'TELEMETRY_UPDATE' | 'CONNECTION_STATUS' | 'HEARTBEAT' | 'EMERGENCY_ALERT' | string;
  timestamp?: string;
  data?: TelemetryPayloadDto;
  payload?: any;
  status?: string;
  incidents?: IncidentRecord[];
  alert?: EmergencyAlert;
}
