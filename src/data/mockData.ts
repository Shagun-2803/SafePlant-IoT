import { SensorReading, AiDetection, IncidentRecord, DeviceConfig, RestrictedZoneBoundary } from '../types/safeplant';

export const initialSensors: SensorReading[] = [
  {
    id: 'temp_core',
    name: 'Reactor Enclosure Temp',
    category: 'temperature',
    value: 24.8,
    unit: '°C',
    minRange: -10,
    maxRange: 80,
    warningThreshold: 45.0,
    criticalThreshold: 60.0,
    status: 'optimal',
    trend: 'stable',
    history: [24.1, 24.2, 24.4, 24.3, 24.5, 24.6, 24.7, 24.8],
    hardwarePin: 'GPIO 4 (DHT22)',
    signalDbm: -58,
    lastUpdated: 'Live',
    source: 'esp32'
  },
  {
    id: 'humidity_ambient',
    name: 'Bay Atmosphere Humidity',
    category: 'humidity',
    value: 48.2,
    unit: '%RH',
    minRange: 10,
    maxRange: 100,
    warningThreshold: 75.0,
    criticalThreshold: 85.0,
    status: 'optimal',
    trend: 'stable',
    history: [49.5, 49.1, 48.8, 48.6, 48.4, 48.3, 48.2, 48.2],
    hardwarePin: 'GPIO 4 (DHT22)',
    signalDbm: -58,
    lastUpdated: 'Live',
    source: 'esp32'
  },
  {
    id: 'gas_combustible',
    name: 'Vapor & Combustible Gas',
    category: 'gas',
    value: 38,
    unit: 'PPM',
    minRange: 0,
    maxRange: 1000,
    warningThreshold: 250,
    criticalThreshold: 500,
    status: 'optimal',
    trend: 'stable',
    history: [32, 34, 35, 36, 38, 37, 39, 38],
    hardwarePin: 'ADC1_CH0 (MQ-2)',
    signalDbm: -61,
    lastUpdated: 'Live',
    source: 'esp32'
  },
  {
    id: 'flame_optical',
    name: 'UV/IR Flame Detector',
    category: 'flame',
    value: 0, // 0 = Safe, 1 = Flame Detected
    unit: 'STATE',
    minRange: 0,
    maxRange: 1,
    warningThreshold: 1,
    criticalThreshold: 1,
    status: 'optimal',
    trend: 'stable',
    history: [0, 0, 0, 0, 0, 0, 0, 0],
    hardwarePin: 'GPIO 15 (KY-026)',
    signalDbm: -55,
    lastUpdated: 'Live',
    source: 'esp32'
  },
  {
    id: 'pressure_steam',
    name: 'Boiler Steam Pressure',
    category: 'pressure',
    value: 4.2,
    unit: 'bar',
    minRange: 0,
    maxRange: 10,
    warningThreshold: 7.5,
    criticalThreshold: 9.0,
    status: 'optimal',
    trend: 'stable',
    history: [4.1, 4.1, 4.2, 4.2, 4.2, 4.3, 4.2, 4.2],
    hardwarePin: 'I2C (BMP280)',
    signalDbm: -57,
    lastUpdated: 'Live',
    source: 'esp32'
  },
  {
    id: 'vibration_turbine',
    name: 'Turbine Vibration Index',
    category: 'vibration',
    value: 1.15,
    unit: 'mm/s',
    minRange: 0,
    maxRange: 15,
    warningThreshold: 4.5,
    criticalThreshold: 7.0,
    status: 'optimal',
    trend: 'stable',
    history: [1.12, 1.14, 1.13, 1.16, 1.15, 1.17, 1.14, 1.15],
    hardwarePin: 'I2C (MPU6050)',
    signalDbm: -59,
    lastUpdated: 'Live',
    source: 'esp32'
  }
];

export const initialDetections: AiDetection[] = [
  {
    id: 'det_1',
    timestamp: 'Live',
    type: 'person',
    label: 'Person Detected in Operating Zone',
    confidence: 0.942,
    zone: 'Robotics Cell A-2',
    status: 'compliant',
    box: { x: 22, y: 35, w: 26, h: 50 }
  }
];

export const defaultRestrictedZone: RestrictedZoneBoundary = {
  id: 'zone_danger_01',
  name: 'Robotic Arm Hazard Perimeter',
  x: 20,
  y: 30,
  w: 60,
  h: 55,
  enabled: true,
  cooldownSeconds: 3
};

export const initialIncidents: IncidentRecord[] = [
  {
    id: 'inc_392',
    timestamp: 'Today, 10:42 AM',
    title: 'Combustible Vapor Threshold Cleared',
    description: 'Vapor concentration returned to safe envelope (<250 PPM) in Solvents Bay.',
    zone: 'Zone B-2 · Solvents Bay',
    severity: 'medium',
    sensorTrigger: 'MQ-2 Gas Sensor',
    peakValue: '275 PPM',
    acknowledged: true,
    resolved: true,
    acknowledgedBy: 'J. Mercer (Lead Safety Officer)',
    sourceType: 'sensor'
  },
  {
    id: 'inc_388',
    timestamp: 'Yesterday, 04:15 PM',
    title: 'Scheduled Steam Pressure Audit',
    description: 'Routine purge cycle completed. Telemetry validated by automated watchdog.',
    zone: 'Zone A-4 · Steam Transfer',
    severity: 'low',
    sensorTrigger: 'BMP280 Sensor',
    peakValue: '5.8 bar',
    acknowledged: true,
    resolved: true,
    acknowledgedBy: 'System Watchdog',
    sourceType: 'sensor'
  }
];

export const initialDeviceConfig: DeviceConfig = {
  fastApiUrl: 'http://192.168.1.120:8000',
  deviceId: 'ESP32-SAFEPLANT-01A',
  firmwareVersion: 'v2.4.1-rc3 (FreeRTOS)',
  pollingIntervalMs: 2000,
  reducedMotion: false,
  hapticFeedback: true,
  temperatureUnit: 'C',
  webSocketEnabled: true,
  fcmToken: 'fcm_token_device_live_38df9a2c_prod',
  notificationsEnabled: true
};
