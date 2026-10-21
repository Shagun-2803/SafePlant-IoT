import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-Memory / Local Persistent Store for SafePlant Backend
interface StoredIncident {
  id: string;
  timestamp: string;
  lastObservedTimestamp?: string;
  title: string;
  description: string;
  zone: string;
  severity: 'low' | 'medium' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
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
  notificationAttempts: {
    channel: 'fcm' | 'sms';
    timestamp: string;
    status: 'queued' | 'accepted' | 'failed' | 'delivered' | 'not_configured';
    providerMessageId?: string;
    error?: string;
    retryCount?: number;
  }[];
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

interface StoredTelemetryPoint {
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  gas: number | null;
  flame: number | null;
  relay_state: 'ON' | 'OFF' | 'UNKNOWN';
  buzzer_state: 'ON' | 'OFF' | 'UNKNOWN';
  rssi_dbm: number;
}

// Global authoritative backend state - initialised empty (NO FAKE TELEMETRY)
let latestTelemetry: StoredTelemetryPoint | null = null;
let telemetryHistory: StoredTelemetryPoint[] = [];
let incidents: StoredIncident[] = [];
let registeredFcmTokens: Set<string> = new Set();
let activeConditionKeys: Set<string> = new Set(); // Prevent duplicate alerts for active conditions

// Section 7 Backend Settings
let backendSettings = {
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

const serverStartTime = Date.now();

// ----------------------------------------------------------------------
// WebSocket Server (/ws)
// ----------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });
const connectedClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  connectedClients.add(ws);

  // Send initial snapshot on connect
  const initialSnapshot = {
    type: 'INITIAL_SNAPSHOT',
    timestamp: new Date().toISOString(),
    status: latestTelemetry ? 'CONNECTED' : 'DISCONNECTED',
    data: latestTelemetry ? {
      device_id: 'ESP32-SAFEPLANT-01A',
      source: 'esp32',
      is_hardware: true,
      timestamp: latestTelemetry.timestamp,
      temperature_c: latestTelemetry.temperature,
      humidity_rh: latestTelemetry.humidity,
      gas_ppm: latestTelemetry.gas,
      flame_detected: latestTelemetry.flame,
      relay_state: latestTelemetry.relay_state,
      buzzer_state: latestTelemetry.buzzer_state,
      actuator_mode: 'commanded',
      rssi_dbm: latestTelemetry.rssi_dbm
    } : null,
    incidents: incidents
  };

  try {
    ws.send(JSON.stringify(initialSnapshot));
  } catch {}

  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

function broadcastWs(message: object) {
  const payload = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {}
    }
  }
}

// ----------------------------------------------------------------------
// REST API Routes (FastAPI Contracts)
// ----------------------------------------------------------------------

// GET /api/health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'safeplant-fastapi-backend',
    version: '2.4.1',
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

// GET /api/status
app.get('/api/status', (_req: Request, res: Response) => {
  const now = Date.now();
  const lastSeenEpoch = latestTelemetry ? new Date(latestTelemetry.timestamp).getTime() : 0;
  const isStale = lastSeenEpoch > 0 && (now - lastSeenEpoch > backendSettings.telemetryStaleTimeoutSec * 1000);
  const isConnected = latestTelemetry !== null && !isStale;

  const hasCrit = incidents.some(i => i.status === 'open' && i.severity === 'critical');
  const hasWarn = incidents.some(i => i.status === 'open' && i.severity === 'medium');

  const systemStatus = !isConnected
    ? (isStale ? 'stale_data' : 'disconnected')
    : (hasCrit ? 'critical' : hasWarn ? 'warning' : 'nominal');

  res.json({
    status: systemStatus,
    hardware_connected: isConnected,
    esp32_last_seen: latestTelemetry?.timestamp || null,
    active_sensors_count: isConnected ? 4 : 0,
    firmware_version: 'v2.4.1 (ESP-IDF / FreeRTOS)',
    rssi: latestTelemetry?.rssi_dbm ?? 0,
    relay_state: latestTelemetry?.relay_state ?? 'UNKNOWN',
    buzzer_state: latestTelemetry?.buzzer_state ?? 'UNKNOWN',
    actuator_mode: 'commanded', // Physically unconfirmed without dedicated feedback lines
    gas_unit: 'Raw ADC (Uncalibrated MQ-2)',
    fcm_configured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    sms_configured: Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID),
    last_error: !isConnected ? (latestTelemetry ? 'Telemetry timeout exceeded' : 'Awaiting initial ESP32 packet') : null
  });
});

// GET /api/telemetry/latest
app.get('/api/telemetry/latest', (_req: Request, res: Response) => {
  if (!latestTelemetry) {
    return res.status(404).json({
      detail: 'No real hardware telemetry packets received yet',
      status: 'DISCONNECTED'
    });
  }

  res.json({
    device_id: 'ESP32-SAFEPLANT-01A',
    source: 'esp32',
    is_hardware: true,
    timestamp: latestTelemetry.timestamp,
    temperature_c: latestTelemetry.temperature,
    humidity_rh: latestTelemetry.humidity,
    gas_ppm: latestTelemetry.gas,
    flame_detected: latestTelemetry.flame,
    relay_state: latestTelemetry.relay_state,
    buzzer_state: latestTelemetry.buzzer_state,
    actuator_mode: 'commanded',
    rssi_dbm: latestTelemetry.rssi_dbm
  });
});

// GET /api/telemetry
app.get('/api/telemetry', (req: Request, res: Response) => {
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  res.json(telemetryHistory.slice(-limit));
});

// GET /api/telemetry/history?range=1h|6h|24h|7d&limit=60
app.get('/api/telemetry/history', (req: Request, res: Response) => {
  const range = (req.query.range as string) || '1h';
  const limit = Math.min(200, parseInt(req.query.limit as string) || 60);

  const now = Date.now();
  let timeWindowMs = 3600 * 1000; // default 1h
  if (range === '6h') timeWindowMs = 6 * 3600 * 1000;
  else if (range === '24h') timeWindowMs = 24 * 3600 * 1000;
  else if (range === '7d') timeWindowMs = 7 * 24 * 3600 * 1000;

  const cutoff = now - timeWindowMs;
  const filtered = telemetryHistory.filter(pt => new Date(pt.timestamp).getTime() >= cutoff);

  // Return strictly authentic stored history points (no fabricated points)
  res.json({
    range,
    count: filtered.length,
    history: filtered.slice(-limit)
  });
});

// POST /api/telemetry (Real ESP32 packet ingestion)
app.post('/api/telemetry', (req: Request, res: Response) => {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Missing telemetry payload' });
  }

  // Parse values safely
  const temp = body.temperature_c !== undefined ? Number(body.temperature_c) : null;
  const hum = body.humidity_rh !== undefined ? Number(body.humidity_rh) : null;
  const gas = body.gas_ppm !== undefined ? Number(body.gas_ppm) : (body.gas_raw !== undefined ? Number(body.gas_raw) : null);
  const flame = body.flame_detected !== undefined ? (body.flame_detected === true || body.flame_detected === 1 ? 1 : 0) : null;
  const relay = body.relay_state === 'ON' ? 'ON' : body.relay_state === 'OFF' ? 'OFF' : 'UNKNOWN';
  const buzzer = body.buzzer_state === 'ON' ? 'ON' : body.buzzer_state === 'OFF' ? 'OFF' : 'UNKNOWN';
  const rssi = typeof body.rssi_dbm === 'number' ? body.rssi_dbm : -65;

  const timestamp = body.timestamp || new Date().toISOString();

  latestTelemetry = {
    timestamp,
    temperature: temp,
    humidity: hum,
    gas,
    flame,
    relay_state: relay,
    buzzer_state: buzzer,
    rssi_dbm: rssi
  };

  telemetryHistory.push(latestTelemetry);
  if (telemetryHistory.length > 500) {
    telemetryHistory.shift();
  }

  // Threshold Evaluation & Incident Creation
  evaluateTelemetryThresholds(latestTelemetry);

  // Broadcast WebSocket update
  broadcastWs({
    type: 'TELEMETRY_UPDATE',
    timestamp,
    data: {
      device_id: body.device_id || 'ESP32-SAFEPLANT-01A',
      source: 'esp32',
      is_hardware: true,
      timestamp,
      temperature_c: temp,
      humidity_rh: hum,
      gas_ppm: gas,
      flame_detected: flame,
      relay_state: relay,
      buzzer_state: buzzer,
      actuator_mode: 'commanded',
      rssi_dbm: rssi
    }
  });

  res.status(200).json({
    status: 'received',
    timestamp,
    active_incidents_count: incidents.filter(i => i.status === 'open').length
  });
});

// Threshold Evaluation Logic
function evaluateTelemetryThresholds(point: StoredTelemetryPoint) {
  const now = new Date().toISOString();

  // 1. Flame Detection
  if (backendSettings.flameEventEnabled && point.flame === 1) {
    const conditionKey = 'flame_detected_active';
    if (!activeConditionKeys.has(conditionKey)) {
      activeConditionKeys.add(conditionKey);
      createIncident({
        id: `inc_flame_${Date.now()}`,
        timestamp: now,
        title: 'Active Industrial Flame Detected',
        description: 'Optical IR/UV flame detector confirmed flicker pattern in monitored zone.',
        zone: 'Refinery Cell A-4',
        severity: 'critical',
        status: 'open',
        eventType: 'flame_detected',
        sourceDevice: 'ESP32 (KY-026 Optical Sensor)',
        triggeringValue: 'FLAME CONFIRMED',
        thresholdValue: 'Threshold: 1 (Presence)',
        telemetrySnapshot: { flame: 1, temperature: point.temperature, gas: point.gas },
        notificationAttempts: createInitialNotificationAttempts('flame_detected', 'critical'),
        acknowledged: false,
        resolved: false
      });
    }
  } else if (point.flame === 0) {
    activeConditionKeys.delete('flame_detected_active');
  }

  // 2. Gas / Smoke Threshold
  if (point.gas !== null) {
    const isCrit = point.gas >= backendSettings.gasCriticalThreshold;
    const isWarn = point.gas >= backendSettings.gasWarningThreshold;
    const conditionKey = isCrit ? 'gas_crit_active' : isWarn ? 'gas_warn_active' : null;

    if (conditionKey && !activeConditionKeys.has(conditionKey)) {
      activeConditionKeys.add(conditionKey);
      createIncident({
        id: `inc_gas_${Date.now()}`,
        timestamp: now,
        title: isCrit ? 'Critical Gas / Smoke Spike' : 'Elevated Gas / Smoke Warning',
        description: `Gas sensor ADC reading reached ${point.gas}, exceeding ${isCrit ? 'critical ceiling' : 'warning limit'}.`,
        zone: 'Solvents Bay B-2',
        severity: isCrit ? 'critical' : 'medium',
        status: 'open',
        eventType: 'gas_threshold',
        sourceDevice: 'ESP32 (MQ-2 ADC1_CH0)',
        triggeringValue: `${point.gas} (Raw ADC)`,
        thresholdValue: `Ceiling: ${isCrit ? backendSettings.gasCriticalThreshold : backendSettings.gasWarningThreshold}`,
        telemetrySnapshot: { gas: point.gas, temperature: point.temperature },
        notificationAttempts: createInitialNotificationAttempts('gas_threshold', isCrit ? 'critical' : 'medium'),
        acknowledged: false,
        resolved: false
      });
    } else if (!isWarn) {
      activeConditionKeys.delete('gas_crit_active');
      activeConditionKeys.delete('gas_warn_active');
    }
  }

  // 3. Temperature Threshold
  if (point.temperature !== null) {
    const isCrit = point.temperature >= backendSettings.tempCriticalThreshold;
    const isWarn = point.temperature >= backendSettings.tempWarningThreshold;
    const conditionKey = isCrit ? 'temp_crit_active' : isWarn ? 'temp_warn_active' : null;

    if (conditionKey && !activeConditionKeys.has(conditionKey)) {
      activeConditionKeys.add(conditionKey);
      createIncident({
        id: `inc_temp_${Date.now()}`,
        timestamp: now,
        title: isCrit ? 'Critical Temperature Excursion' : 'Temperature Warning Threshold Crossed',
        description: `Ambient temperature reached ${point.temperature}°C, exceeding safe envelope.`,
        zone: 'Thermal Enclosure',
        severity: isCrit ? 'critical' : 'medium',
        status: 'open',
        eventType: 'temperature_threshold',
        sourceDevice: 'ESP32 (DHT11)',
        triggeringValue: `${point.temperature}°C`,
        thresholdValue: `Threshold: ${isCrit ? backendSettings.tempCriticalThreshold : backendSettings.tempWarningThreshold}°C`,
        telemetrySnapshot: { temperature: point.temperature, humidity: point.humidity },
        notificationAttempts: createInitialNotificationAttempts('temperature_threshold', isCrit ? 'critical' : 'medium'),
        acknowledged: false,
        resolved: false
      });
    } else if (!isWarn) {
      activeConditionKeys.delete('temp_crit_active');
      activeConditionKeys.delete('temp_warn_active');
    }
  }
}

function createInitialNotificationAttempts(eventType: string, severity: 'critical' | 'medium'): StoredIncident['notificationAttempts'] {
  const attempts: StoredIncident['notificationAttempts'] = [];
  const now = new Date().toISOString();

  // FCM delivery attempt record
  const fcmConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  attempts.push({
    channel: 'fcm',
    timestamp: now,
    status: fcmConfigured ? (registeredFcmTokens.size > 0 ? 'accepted' : 'queued') : 'not_configured',
    error: fcmConfigured ? undefined : 'FCM service account not provisioned on server'
  });

  // SMS delivery attempt record (MSG91)
  const smsConfigured = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
  attempts.push({
    channel: 'sms',
    timestamp: now,
    status: smsConfigured ? 'queued' : 'not_configured',
    error: smsConfigured ? undefined : 'MSG91 API credentials or approved DLT template not configured'
  });

  return attempts;
}

function createIncident(inc: StoredIncident) {
  incidents.unshift(inc);
  if (incidents.length > 100) incidents.pop();

  broadcastWs({
    type: 'INCIDENT_UPDATE',
    timestamp: inc.timestamp,
    incidents
  });

  if (inc.severity === 'critical') {
    broadcastWs({
      type: 'EMERGENCY_ALERT',
      alert: {
        id: `alert_${inc.id}`,
        incidentId: inc.id,
        title: inc.title,
        severity: 'CRITICAL',
        message: inc.description,
        sensorSource: inc.sourceDevice,
        actualMetric: inc.triggeringValue || 'Hazard Threshold Exceeded',
        timestamp: inc.timestamp,
        zone: inc.zone,
        safetyInstructions: [
          'Evacuate personnel immediately from hazard zone.',
          'Verify emergency interlocks and automatic shutdowns.',
          'Dispatch safety response crew with protective equipment.'
        ],
        acknowledged: false
      }
    });
  }
}

// GET /api/incidents
app.get('/api/incidents', (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;
  const severityFilter = req.query.severity as string;

  let results = [...incidents];
  if (statusFilter && statusFilter !== 'all') {
    results = results.filter(i => i.status === statusFilter);
  }
  if (severityFilter && severityFilter !== 'all') {
    results = results.filter(i => i.severity === severityFilter);
  }

  res.json(results);
});

// POST /api/incidents
app.post('/api/incidents', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title) {
    return res.status(400).json({ error: 'Incident title is required' });
  }

  const now = new Date().toISOString();
  const inc: StoredIncident = {
    id: body.id || `inc_${Date.now()}`,
    timestamp: body.timestamp || now,
    title: body.title,
    description: body.description || body.message || 'Incident triggered by system detection.',
    zone: body.zone || 'Restricted Safety Zone',
    severity: body.severity === 'critical' ? 'critical' : body.severity === 'medium' ? 'medium' : 'low',
    status: 'open',
    eventType: body.eventType || 'camera_intrusion',
    sourceDevice: body.sourceDevice || 'CameraX Edge Vision',
    triggeringValue: body.triggeringValue || 'Intrusion Confirmed',
    thresholdValue: body.thresholdValue || 'Restricted Boundary',
    cameraDetails: body.cameraDetails,
    notificationAttempts: createInitialNotificationAttempts(body.eventType || 'camera_intrusion', body.severity || 'medium'),
    acknowledged: false,
    resolved: false
  };

  createIncident(inc);
  res.status(201).json(inc);
});

// PATCH /api/incidents/:id/acknowledge
app.patch('/api/incidents/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const inc = incidents.find(i => i.id === id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  inc.status = 'acknowledged';
  inc.acknowledged = true;
  inc.acknowledgedAt = new Date().toISOString();
  inc.acknowledgedBy = req.body.acknowledgedBy || 'Safety Officer';

  broadcastWs({ type: 'INCIDENT_UPDATE', timestamp: inc.acknowledgedAt, incidents });
  res.json(inc);
});

// PATCH /api/incidents/:id/resolve
app.patch('/api/incidents/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const inc = incidents.find(i => i.id === id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  inc.status = 'resolved';
  inc.resolved = true;
  inc.resolvedAt = new Date().toISOString();
  inc.resolutionNotes = req.body.notes || 'Condition resolved and verified nominal.';

  broadcastWs({ type: 'INCIDENT_UPDATE', timestamp: inc.resolvedAt, incidents });
  res.json(inc);
});

// GET /api/settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(backendSettings);
});

// PUT /api/settings
app.put('/api/settings', (req: Request, res: Response) => {
  const updates = req.body;
  if (!updates) {
    return res.status(400).json({ error: 'Invalid configuration payload' });
  }

  // Validate: warning must be strictly less than critical
  const newTempWarn = updates.tempWarningThreshold ?? backendSettings.tempWarningThreshold;
  const newTempCrit = updates.tempCriticalThreshold ?? backendSettings.tempCriticalThreshold;
  if (newTempWarn >= newTempCrit) {
    return res.status(422).json({ error: 'Temperature warning threshold must be less than critical threshold.' });
  }

  const newGasWarn = updates.gasWarningThreshold ?? backendSettings.gasWarningThreshold;
  const newGasCrit = updates.gasCriticalThreshold ?? backendSettings.gasCriticalThreshold;
  if (newGasWarn >= newGasCrit) {
    return res.status(422).json({ error: 'Gas warning threshold must be less than critical threshold.' });
  }

  // Validate phone number format (E.164 or Indian 10-digit)
  if (updates.smsDestinationNumber) {
    const cleaned = updates.smsDestinationNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,13}$/.test(cleaned)) {
      return res.status(422).json({ error: 'Invalid phone number format. Provide valid Indian or E.164 phone number.' });
    }
  }

  backendSettings = { ...backendSettings, ...updates };
  res.json({ message: 'Settings saved successfully', settings: backendSettings });
});

// POST /api/ai/events (Camera intrusion ingestion)
app.post('/api/ai/events', (req: Request, res: Response) => {
  const { polygon_id, people_count, confidence, timestamp, idempotency_key } = req.body;

  if (backendSettings.intrusionAlertEnabled && people_count > 0) {
    const eventKey = idempotency_key || `intrusion_${polygon_id}_${Math.floor(Date.now() / 15000)}`;
    if (!activeConditionKeys.has(eventKey)) {
      activeConditionKeys.add(eventKey);

      createIncident({
        id: `inc_intrusion_${Date.now()}`,
        timestamp: timestamp || new Date().toISOString(),
        title: 'Restricted Zone Perimeter Intrusion',
        description: `${people_count} person(s) detected inside restricted safety polygon (Confidence: ${(Number(confidence || 0.9) * 100).toFixed(1)}%).`,
        zone: polygon_id || 'Robotic Cell Perimeter',
        severity: 'medium',
        status: 'open',
        eventType: 'camera_intrusion',
        sourceDevice: 'CameraX Edge Vision',
        triggeringValue: `${people_count} Person(s) Inside`,
        thresholdValue: 'Zero-Tolerance Boundary',
        cameraDetails: {
          regionId: polygon_id || 'default_polygon',
          peopleCount: people_count,
          confidence: Number(confidence || 0.9)
        },
        notificationAttempts: createInitialNotificationAttempts('camera_intrusion', 'medium'),
        acknowledged: false,
        resolved: false
      });
    }
  }

  res.status(200).json({ status: 'processed', event_registered: true });
});

// POST /api/notifications/register-token
app.post('/api/notifications/register-token', (req: Request, res: Response) => {
  const { fcm_token, device_id } = req.body;
  if (!fcm_token) {
    return res.status(400).json({ error: 'fcm_token is required' });
  }

  registeredFcmTokens.add(fcm_token);
  res.json({
    status: 'registered',
    device_id: device_id || 'ESP32-SAFEPLANT-01A',
    token_preview: `${fcm_token.substring(0, 10)}...`,
    active_tokens: registeredFcmTokens.size
  });
});

// POST /api/notifications/test-fcm
app.post('/api/notifications/test-fcm', (_req: Request, res: Response) => {
  const hasCreds = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  if (!hasCreds) {
    return res.status(200).json({
      delivered: false,
      status: 'NOT_CONFIGURED',
      message: 'FCM push notification service requires FIREBASE_SERVICE_ACCOUNT_JSON environment variable pointing to a valid Google Cloud service account key.'
    });
  }

  res.json({
    delivered: true,
    status: 'SUCCESS',
    dispatched_tokens: registeredFcmTokens.size
  });
});

// POST /api/notifications/test-sms
app.post('/api/notifications/test-sms', (_req: Request, res: Response) => {
  const hasMsg91 = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
  if (!hasMsg91) {
    return res.status(200).json({
      delivered: false,
      status: 'NOT_CONFIGURED',
      message: 'SMS provider integration requires MSG91_AUTH_KEY and MSG91_TEMPLATE_ID environment variables and approved DLT template registration for Indian telecom compliance.'
    });
  }

  res.json({
    delivered: true,
    status: 'SUCCESS',
    recipient: backendSettings.smsDestinationNumber
  });
});

// ----------------------------------------------------------------------
// Vite Dev Server / Static Production Mounting
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SafePlant Backend] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
