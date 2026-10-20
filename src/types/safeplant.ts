export type SystemSafetyState = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export type OperatingMode = 'DEMO' | 'HARDWARE';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'STALE_DATA';

export interface SensorReading {
  id: string;
  name: string;
  category: 'temperature' | 'humidity' | 'gas' | 'flame' | 'pressure' | 'vibration';
  value: number;
  unit: string;
  minRange: number;
  maxRange: number;
  warningThreshold: number;
  criticalThreshold: number;
  status: 'optimal' | 'warning' | 'critical';
  trend: 'rising' | 'falling' | 'stable';
  history: number[];
  hardwarePin: string;
  signalDbm: number;
  lastUpdated: string;
}

export interface AiDetection {
  id: string;
  timestamp: string;
  type: 'ppe' | 'smoke' | 'perimeter' | 'flame' | 'thermal';
  label: string;
  confidence: number;
  zone: string;
  status: 'compliant' | 'warning' | 'alert';
  box?: {
    x: number; // percentage
    y: number;
    w: number;
    h: number;
  };
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
}

export interface DeviceConfig {
  mode: OperatingMode;
  fastApiUrl: string;
  mqttBroker: string;
  mqttTopic: string;
  deviceId: string;
  firmwareVersion: string;
  wifiSsid: string;
  pollingIntervalMs: number;
  reducedMotion: boolean;
  hapticFeedback: boolean;
  temperatureUnit: 'C' | 'F';
}
