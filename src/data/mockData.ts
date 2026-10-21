import { 
  SensorReading, 
  AiDetection, 
  IncidentRecord, 
  DeviceConfig, 
  RestrictedZonePolygon 
} from '../types/safeplant';

// Clean initial sensor definitions with NO fabricated readings (value: null / UNKNOWN)
// Prototype hardware: DHT11 (Temp & Humidity), MQ-2 Gas/Smoke, Optical Flame
export const initialSensors: SensorReading[] = [
  {
    id: 'temp_dht11',
    name: 'Ambient Temperature (DHT11)',
    category: 'temperature',
    value: null,
    unit: '°C',
    minRange: 0,
    maxRange: 50,
    warningThreshold: 45.0,
    criticalThreshold: 50.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'GPIO 4 (DHT11)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'esp32',
    calibrationStatus: 'calibrated'
  },
  {
    id: 'humidity_dht11',
    name: 'Relative Humidity (DHT11)',
    category: 'humidity',
    value: null,
    unit: '%RH',
    minRange: 20,
    maxRange: 90,
    warningThreshold: 75.0,
    criticalThreshold: 85.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'GPIO 4 (DHT11)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'esp32',
    calibrationStatus: 'calibrated'
  },
  {
    id: 'gas_mq2',
    name: 'Gas / Smoke (MQ-2)',
    category: 'gas',
    value: null,
    unit: 'Raw ADC',
    minRange: 0,
    maxRange: 4095,
    warningThreshold: 1500,
    criticalThreshold: 2500,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'ADC1_CH0 (Pin 36)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'esp32',
    calibrationStatus: 'raw' // Explicitly uncalibrated raw ADC reading
  },
  {
    id: 'flame_optical',
    name: 'Optical Flame Detector',
    category: 'flame',
    value: null,
    unit: 'STATE',
    minRange: 0,
    maxRange: 1,
    warningThreshold: 1,
    criticalThreshold: 1,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'GPIO 15 (KY-026)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'esp32',
    calibrationStatus: 'calibrated'
  }
];

// Initial detections empty until real vision inference or backend reports events
export const initialDetections: AiDetection[] = [];

// Multi-vertex polygon for camera intrusion zone
export const defaultRestrictedPolygon: RestrictedZonePolygon = {
  id: 'zone_danger_01',
  name: 'Robotic Cell Perimeter',
  vertices: [
    { x: 18, y: 28 },
    { x: 82, y: 28 },
    { x: 88, y: 84 },
    { x: 14, y: 84 }
  ],
  enabled: true,
  cooldownSeconds: 15,
  exitConfirmationSeconds: 5
};

// Initial incidents empty until real backend incident records arrive
export const initialIncidents: IncidentRecord[] = [];

// Section 7: Persistent threshold & alert configuration with clearly labelled prototype defaults
export const initialDeviceConfig: DeviceConfig = {
  fastApiUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  deviceId: 'ESP32-SAFEPLANT-01A',
  firmwareVersion: 'v2.4.1 (ESP-IDF / FreeRTOS)',
  pollingIntervalMs: 2500,
  reducedMotion: false,
  hapticFeedback: true,
  temperatureUnit: 'C',
  webSocketEnabled: true,
  fcmToken: null, // NOT CONFIGURED in web prototype
  notificationsEnabled: false,

  // Section 7 required settings:
  tempWarningThreshold: 45.0,
  tempCriticalThreshold: 50.0,
  gasWarningThreshold: 1500,
  gasCriticalThreshold: 2500,
  humidityWarningThreshold: 75.0,
  humidityCriticalThreshold: 85.0,
  flameEventEnabled: true,
  tempNotificationsEnabled: true,
  gasNotificationsEnabled: true,
  humidityNotificationsEnabled: false,
  flameNotificationsEnabled: true,
  intrusionAlertEnabled: true,
  intrusionReminderCooldownSec: 15,
  exitConfirmationSec: 5,
  telemetryStaleTimeoutSec: 8,
  smsDestinationNumber: '+91 98765 43210',
  fcmNotificationsEnabled: false,
  smsNotificationsEnabled: false
};
