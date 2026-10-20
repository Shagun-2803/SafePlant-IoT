import { SensorReading, AiDetection, IncidentRecord, DeviceConfig, RestrictedZoneBoundary } from '../types/safeplant';

// Clean initial sensor definitions with NO fabricated readings (value: null / UNKNOWN)
export const initialSensors: SensorReading[] = [
  {
    id: 'temp_core',
    name: 'Reactor Enclosure Temp',
    category: 'temperature',
    value: null,
    unit: '°C',
    minRange: -10,
    maxRange: 80,
    warningThreshold: 45.0,
    criticalThreshold: 60.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'GPIO 4 (DHT22)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'unknown'
  },
  {
    id: 'humidity_ambient',
    name: 'Bay Atmosphere Humidity',
    category: 'humidity',
    value: null,
    unit: '%RH',
    minRange: 10,
    maxRange: 100,
    warningThreshold: 75.0,
    criticalThreshold: 85.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'GPIO 4 (DHT22)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'unknown'
  },
  {
    id: 'gas_combustible',
    name: 'Vapor & Combustible Gas',
    category: 'gas',
    value: null,
    unit: 'PPM',
    minRange: 0,
    maxRange: 1000,
    warningThreshold: 250,
    criticalThreshold: 500,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'ADC1_CH0 (MQ-2)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'unknown'
  },
  {
    id: 'flame_optical',
    name: 'UV/IR Flame Detector',
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
    source: 'unknown'
  },
  {
    id: 'pressure_steam',
    name: 'Boiler Steam Pressure',
    category: 'pressure',
    value: null,
    unit: 'bar',
    minRange: 0,
    maxRange: 10,
    warningThreshold: 7.5,
    criticalThreshold: 9.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'I2C (BMP280)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'unknown'
  },
  {
    id: 'vibration_turbine',
    name: 'Turbine Vibration Index',
    category: 'vibration',
    value: null,
    unit: 'mm/s',
    minRange: 0,
    maxRange: 15,
    warningThreshold: 4.5,
    criticalThreshold: 7.0,
    status: 'unknown',
    trend: 'stable',
    history: [],
    hardwarePin: 'I2C (MPU6050)',
    signalDbm: 0,
    lastUpdated: 'No data',
    source: 'unknown'
  }
];

// Initial detections empty until real vision inference or backend reports events
export const initialDetections: AiDetection[] = [];

export const defaultRestrictedZone: RestrictedZoneBoundary = {
  id: 'zone_danger_01',
  name: 'Robotic Cell A-2 Hazard Perimeter',
  x: 20,
  y: 30,
  w: 60,
  h: 55,
  enabled: true,
  cooldownSeconds: 3
};

// Initial incidents empty until real backend incident records arrive
export const initialIncidents: IncidentRecord[] = [];

// Device config with FCM unconfigured (no fabricated dummy token)
export const initialDeviceConfig: DeviceConfig = {
  fastApiUrl: 'http://192.168.1.120:8000',
  deviceId: 'ESP32-SAFEPLANT-01A',
  firmwareVersion: 'v2.4.1-rc3 (FreeRTOS)',
  pollingIntervalMs: 2000,
  reducedMotion: false,
  hapticFeedback: true,
  temperatureUnit: 'C',
  webSocketEnabled: true,
  fcmToken: null, // NOT CONFIGURED in web prototype
  notificationsEnabled: false
};
