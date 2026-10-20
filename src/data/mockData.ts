import { SensorReading, AiDetection, IncidentRecord, DeviceConfig } from '../types/safeplant';

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
    lastUpdated: 'Just now'
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
    lastUpdated: 'Just now'
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
    hardwarePin: 'ADC1_CH0 / GPIO 36 (MQ-2)',
    signalDbm: -61,
    lastUpdated: 'Just now'
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
    hardwarePin: 'GPIO 15 (KY-026 Optical)',
    signalDbm: -55,
    lastUpdated: 'Just now'
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
    hardwarePin: 'I2C SDA:21 SCL:22 (BMP280)',
    signalDbm: -57,
    lastUpdated: '12s ago'
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
    hardwarePin: 'I2C SDA:21 SCL:22 (MPU6050)',
    signalDbm: -59,
    lastUpdated: '5s ago'
  }
];

export const initialDetections: AiDetection[] = [
  {
    id: 'det_1',
    timestamp: '13:19:42',
    type: 'ppe',
    label: 'PPE Compliant: Hardhat & High-Vis Vest',
    confidence: 0.984,
    zone: 'Assembly Bay 2',
    status: 'compliant',
    box: { x: 14, y: 62, w: 9, h: 22 }
  },
  {
    id: 'det_2',
    timestamp: '13:18:10',
    type: 'ppe',
    label: 'PPE Compliant: Safety Goggles & Vest',
    confidence: 0.967,
    zone: 'Control Desk A',
    status: 'compliant',
    box: { x: 75, y: 70, w: 8, h: 20 }
  },
  {
    id: 'det_3',
    timestamp: '13:14:05',
    type: 'perimeter',
    label: 'Perimeter Clearance: Automated Arm Cell',
    confidence: 0.991,
    zone: 'Robotics Enclosure 4',
    status: 'compliant',
    box: { x: 28, y: 38, w: 18, h: 32 }
  },
  {
    id: 'det_4',
    timestamp: '13:08:29',
    type: 'thermal',
    label: 'Thermal Flange: 185.3°C (Nominal Steam Spec)',
    confidence: 0.978,
    zone: 'Primary Header Valve 3',
    status: 'compliant'
  }
];

export const initialIncidents: IncidentRecord[] = [
  {
    id: 'inc_392',
    timestamp: 'Today, 10:42 AM',
    title: 'Transient Combustible Gas Spike',
    description: 'Vapor concentration elevated to 275 PPM during routine solvent purge. Exhaust purge active, level returned to baseline within 4 minutes.',
    zone: 'Zone B-2 · Solvents Bay',
    severity: 'medium',
    sensorTrigger: 'MQ-2 Combustible Gas',
    peakValue: '275 PPM (Threshold: 250 PPM)',
    acknowledged: true,
    resolved: true,
    acknowledgedBy: 'J. Mercer (Lead Safety Officer)'
  },
  {
    id: 'inc_388',
    timestamp: 'Yesterday, 04:15 PM',
    title: 'Scheduled Thermal Pressure Verification',
    description: 'Header valve steam purge test conducted under supervision. Peak temperature within standard testing parameters.',
    zone: 'Zone A-4 · Steam Transfer',
    severity: 'low',
    sensorTrigger: 'BMP280 / IR Thermal',
    peakValue: '5.8 bar (Test Target 6.0 bar)',
    acknowledged: true,
    resolved: true,
    acknowledgedBy: 'Automation Subsystem'
  },
  {
    id: 'inc_375',
    timestamp: 'Oct 18, 08:30 AM',
    title: 'ESP32 Node 01 Network Handshake Restored',
    description: 'Wi-Fi RSSI dropped below -82 dBm during facility maintenance; re-associated on channel 6 within 1.2 seconds.',
    zone: 'Substation Telemetry Bridge',
    severity: 'low',
    sensorTrigger: 'ESP32 Heartbeat',
    peakValue: '1200ms latency',
    acknowledged: true,
    resolved: true,
    acknowledgedBy: 'System Watchdog'
  }
];

export const initialDeviceConfig: DeviceConfig = {
  mode: 'DEMO',
  fastApiUrl: 'http://192.168.1.120:8000',
  mqttBroker: 'mqtt://safeplant-broker.local:1883',
  mqttTopic: 'safeplant/node_01/telemetry',
  deviceId: 'ESP32-SAFEPLANT-01A',
  firmwareVersion: 'v2.4.1-rc3 (FreeRTOS)',
  wifiSsid: 'INDUSTRIAL_IOT_SECURE_5G',
  pollingIntervalMs: 1500,
  reducedMotion: false,
  hapticFeedback: true,
  temperatureUnit: 'C'
};
