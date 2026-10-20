import { 
  SensorReading, 
  ConnectionStatus, 
  IncidentRecord, 
  AiDetection, 
  TelemetryPayloadDto, 
  WebSocketMessage,
  EmergencyAlert,
  FcmTokenRegistrationPayload
} from '../types/safeplant';

export interface FastApiCallbacks {
  onTelemetryUpdate: (sensors: SensorReading[], timestamp?: string, source?: 'esp32' | 'vision' | 'unknown') => void;
  onConnectionStatusChange: (status: ConnectionStatus, message?: string) => void;
  onIncidentsUpdate: (incidents: IncidentRecord[]) => void;
  onAiEventsUpdate: (detections: AiDetection[]) => void;
  onEmergencyAlert: (alert: EmergencyAlert) => void;
}

export class FastApiNetworkClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private callbacks: FastApiCallbacks;
  
  // Reconnection and backoff state
  private reconnectAttempt = 0;
  private reconnectTimeout: any = null;
  private maxBackoffMs = 30000;
  private baseBackoffMs = 1500;
  
  // REST Polling fallback
  private pollingTimer: any = null;
  private isWsStreaming = false;
  private isDestroyed = false;

  // Stale data watchdog
  private lastTelemetryTime = 0;
  private watchdogTimer: any = null;

  // Deduplication of alerts
  private handledAlertIds = new Set<string>();

  constructor(baseUrl: string, callbacks: FastApiCallbacks) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, '');
    this.wsUrl = this.deriveWsUrl(this.baseUrl);
    this.callbacks = callbacks;

    this.setupLifecycleListeners();
    this.startWatchdog();
  }

  public setBaseUrl(newUrl: string) {
    const formatted = newUrl.trim().replace(/\/$/, '');
    if (this.baseUrl !== formatted) {
      this.baseUrl = formatted;
      this.wsUrl = this.deriveWsUrl(formatted);
      this.reconnect();
    }
  }

  private deriveWsUrl(httpUrl: string): string {
    try {
      const url = new URL(httpUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws`;
    } catch {
      return `ws://${httpUrl.replace(/^http:\/\//, '').replace(/^https:\/\//, '')}/ws`;
    }
  }

  public start() {
    this.isDestroyed = false;
    this.connectWebSocket();
  }

  public stop() {
    this.isDestroyed = true;
    this.cleanupWebSocket();
    this.stopPollingFallback();
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
  }

  // Lifecycle listeners (Background / Foreground transition)
  private setupLifecycleListeners() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Pause heavy streaming when backgrounded
          this.cleanupWebSocket();
          this.stopPollingFallback();
        } else {
          // Resume when foregrounded
          if (!this.isDestroyed) {
            this.reconnect();
          }
        }
      });
    }
  }

  private connectWebSocket() {
    if (this.isDestroyed || this.ws) return;

    this.callbacks.onConnectionStatusChange('CONNECTING', `Connecting to WebSocket at ${this.wsUrl}...`);

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isWsStreaming = true;
        this.reconnectAttempt = 0;
        this.stopPollingFallback();
        this.callbacks.onConnectionStatusChange('CONNECTED', 'Streaming via FastAPI WebSocket (/ws)');
      };

      this.ws.onmessage = (event) => {
        this.lastTelemetryTime = Date.now();
        this.parseIncomingMessage(event.data);
      };

      this.ws.onerror = () => {
        this.handleWebSocketFailure();
      };

      this.ws.onclose = () => {
        this.handleWebSocketFailure();
      };
    } catch (e) {
      this.handleWebSocketFailure();
    }
  }

  private handleWebSocketFailure() {
    this.cleanupWebSocket();
    this.isWsStreaming = false;

    if (this.isDestroyed) return;

    // Start REST polling fallback immediately while WebSocket reconnects
    this.startPollingFallback();

    // Exponential backoff for WebSocket reconnection
    this.scheduleReconnect();
  }

  private cleanupWebSocket() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectAttempt++;
    // Exponential backoff: 1.5s, 3s, 6s, 12s, max 30s + small jitter
    const delay = Math.min(
      this.maxBackoffMs,
      this.baseBackoffMs * Math.pow(1.8, this.reconnectAttempt - 1) + Math.random() * 500
    );

    this.callbacks.onConnectionStatusChange(
      'RECONNECTING',
      `WebSocket disconnected. Reconnecting in ${(delay / 1000).toFixed(1)}s (Attempt ${this.reconnectAttempt})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed && !this.isWsStreaming) {
        this.connectWebSocket();
      }
    }, delay);
  }

  public reconnect() {
    this.cleanupWebSocket();
    this.reconnectAttempt = 0;
    this.connectWebSocket();
  }

  // REST Polling Fallback (GET /api/telemetry/latest and GET /api/incidents)
  private startPollingFallback() {
    if (this.pollingTimer) return;

    this.pollRestEndpoint();

    this.pollingTimer = setInterval(() => {
      if (this.isWsStreaming || this.isDestroyed) {
        this.stopPollingFallback();
        return;
      }
      this.pollRestEndpoint();
    }, 2500);
  }

  private stopPollingFallback() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollRestEndpoint() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const [telemetryResp, incidentsResp] = await Promise.all([
        fetch(`${this.baseUrl}/api/telemetry/latest`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        }),
        fetch(`${this.baseUrl}/api/incidents`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        }).catch(() => null)
      ]);
      clearTimeout(timeoutId);

      if (telemetryResp.ok) {
        const json = await telemetryResp.json();
        this.lastTelemetryTime = Date.now();
        this.callbacks.onConnectionStatusChange('CONNECTED', 'REST Polling Active (Fallback Mode)');
        this.processTelemetryPayload(json);
      }

      if (incidentsResp && incidentsResp.ok) {
        const incidents = await incidentsResp.json();
        if (Array.isArray(incidents)) {
          this.callbacks.onIncidentsUpdate(incidents);
        }
      }
    } catch {
      // If neither WS nor REST responds, check if stale or disconnected
      if (Date.now() - this.lastTelemetryTime > 6000) {
        this.callbacks.onConnectionStatusChange('DISCONNECTED', 'Backend unreachable at ' + this.baseUrl);
      }
    }
  }

  // Stale Data Watchdog (> 5 seconds with no incoming telemetry packet)
  private startWatchdog() {
    this.watchdogTimer = setInterval(() => {
      if (this.lastTelemetryTime > 0 && Date.now() - this.lastTelemetryTime > 5000) {
        this.callbacks.onConnectionStatusChange(
          'STALE_DATA',
          'No telemetry received for >5s. Heartbeat timeout.'
        );
      }
    }, 1500);
  }

  // Inspect message structure before parsing to prevent crashes
  private parseIncomingMessage(raw: any) {
    if (!raw) return;

    let parsed: any;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn('Malformed WebSocket message received:', raw);
      return;
    }

    if (!parsed || typeof parsed !== 'object') return;

    const msgType = parsed.type || parsed.event || 'TELEMETRY_UPDATE';

    switch (msgType) {
      case 'INITIAL_SNAPSHOT': {
        if (parsed.telemetry || parsed.data) {
          this.processTelemetryPayload(parsed.telemetry || parsed.data);
        }
        if (Array.isArray(parsed.incidents)) {
          this.callbacks.onIncidentsUpdate(parsed.incidents);
        }
        if (Array.isArray(parsed.ai_events)) {
          this.callbacks.onAiEventsUpdate(parsed.ai_events);
        }
        if (parsed.alert) {
          this.checkAndTriggerAlert(parsed.alert);
        }
        break;
      }

      case 'TELEMETRY_UPDATE': {
        const payload = parsed.data || parsed.payload || parsed;
        this.processTelemetryPayload(payload);
        break;
      }

      case 'EMERGENCY_ALERT': {
        if (parsed.alert) {
          this.checkAndTriggerAlert(parsed.alert);
        }
        break;
      }

      case 'CONNECTION_STATUS': {
        if (parsed.status === 'stale') {
          this.callbacks.onConnectionStatusChange('STALE_DATA', parsed.message);
        } else if (parsed.status === 'connected') {
          this.callbacks.onConnectionStatusChange('CONNECTED', parsed.message);
        }
        break;
      }

      default: {
        if ('temperature_c' in parsed || 'temp' in parsed || 'gas_ppm' in parsed) {
          this.processTelemetryPayload(parsed);
        }
        break;
      }
    }
  }

  // Deduplicate and trigger emergency alert
  private checkAndTriggerAlert(alertData: any) {
    const alertId = alertData.id || alertData.incidentId || `alert_${Date.now()}`;
    if (this.handledAlertIds.has(alertId)) return; // Deduplicated!

    this.handledAlertIds.add(alertId);

    const alert: EmergencyAlert = {
      id: alertId,
      incidentId: alertData.incidentId || alertId,
      title: alertData.title || 'CRITICAL HAZARD DETECTED',
      severity: alertData.severity || 'CRITICAL',
      message: alertData.message || alertData.description || 'Confirmed hazard event received from FastAPI.',
      sensorSource: alertData.sensorSource || alertData.sensorTrigger || 'Hardware Telemetry Bus',
      actualMetric: alertData.actualMetric || alertData.peakValue || 'Exceeded Threshold',
      timestamp: alertData.timestamp || new Date().toLocaleTimeString(),
      zone: alertData.zone || 'Refinery Area A-4',
      safetyInstructions: alertData.safetyInstructions || [
        'Evacuate personnel from designated hazardous perimeter.',
        'Activate emergency extraction exhaust scrubbers.',
        'Notify Lead Plant Operations Officer.'
      ],
      acknowledged: false
    };

    this.callbacks.onEmergencyAlert(alert);
  }

  // Process and sanitize telemetry payload
  public processTelemetryPayload(payload: any) {
    if (!payload || typeof payload !== 'object') return;

    // Simulation Overwrite Shield: Reject simulation packets
    if (payload.source === 'simulation' || payload.is_hardware === false) {
      console.warn('Simulation Overwrite Shield: Dropped simulation packet from backend.');
      return;
    }

    const deviceTimestamp = payload.timestamp || payload.device_timestamp || new Date().toISOString();
    const packetSource: 'esp32' | 'vision' | 'unknown' = payload.source === 'camera_vision' ? 'vision' : 'esp32';

    // Treat unknown or missing sensor values as UNKNOWN (null) rather than zero
    const parseSensorVal = (val: any): number | null => {
      if (val === null || val === undefined || val === 'unknown' || val === 'UNKNOWN' || val === '') {
        return null;
      }
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const tempVal = parseSensorVal(payload.temperature_c ?? payload.temperature ?? payload.temp);
    const humVal = parseSensorVal(payload.humidity_rh ?? payload.humidity ?? payload.hum);
    const gasVal = parseSensorVal(payload.gas_ppm ?? payload.gas ?? payload.mq2);
    
    let flameVal: number | null = null;
    if (payload.flame_detected !== undefined && payload.flame_detected !== null) {
      flameVal = payload.flame_detected === true || payload.flame_detected === 1 ? 1 : 0;
    } else if (payload.flame !== undefined && payload.flame !== null) {
      flameVal = Number(payload.flame) > 0 ? 1 : 0;
    }

    const pressVal = parseSensorVal(payload.pressure_bar ?? payload.pressure);
    const vibVal = parseSensorVal(payload.vibration_index ?? payload.vibration);
    const rssi = parseSensorVal(payload.rssi_dbm ?? payload.rssi) ?? 0;

    // Check for critical emergency hazard thresholds
    if (gasVal !== null && gasVal >= 500) {
      this.checkAndTriggerAlert({
        id: `gas_crit_${Math.floor(Date.now() / 30000)}`, // Deduplicated per 30s
        title: 'CRITICAL: Severe Combustible Vapor Spike',
        severity: 'CRITICAL',
        message: `Combustible vapor concentration reached ${gasVal} PPM, exceeding safe explosive ceiling (500 PPM).`,
        sensorSource: 'MQ-2 Sensor (ADC1_CH0)',
        actualMetric: `${gasVal} PPM`,
        zone: 'Zone B-2 · Solvents Bay'
      });
    } else if (flameVal === 1) {
      this.checkAndTriggerAlert({
        id: `flame_crit_${Math.floor(Date.now() / 30000)}`,
        title: 'CRITICAL HAZARD: Active Fire Detected',
        severity: 'CRITICAL',
        message: 'Dual-band infrared flame flicker confirmed on optical detection bus.',
        sensorSource: 'KY-026 Optical IR/UV (Pin 15)',
        actualMetric: 'FLAME CONFIRMED',
        zone: 'Refinery Tower A-4'
      });
    }

    const updatedSensors: SensorReading[] = [
      {
        id: 'temp_core',
        name: 'Reactor Enclosure Temp',
        category: 'temperature',
        value: tempVal,
        unit: '°C',
        minRange: -10,
        maxRange: 80,
        warningThreshold: 45.0,
        criticalThreshold: 60.0,
        status: tempVal === null ? 'unknown' : tempVal >= 60 ? 'critical' : tempVal >= 45 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [tempVal],
        hardwarePin: 'GPIO 4 (DHT22)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      },
      {
        id: 'humidity_ambient',
        name: 'Bay Atmosphere Humidity',
        category: 'humidity',
        value: humVal,
        unit: '%RH',
        minRange: 10,
        maxRange: 100,
        warningThreshold: 75.0,
        criticalThreshold: 85.0,
        status: humVal === null ? 'unknown' : humVal >= 85 ? 'critical' : humVal >= 75 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [humVal],
        hardwarePin: 'GPIO 4 (DHT22)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      },
      {
        id: 'gas_combustible',
        name: 'Vapor & Combustible Gas',
        category: 'gas',
        value: gasVal,
        unit: 'PPM',
        minRange: 0,
        maxRange: 1000,
        warningThreshold: 250,
        criticalThreshold: 500,
        status: gasVal === null ? 'unknown' : gasVal >= 500 ? 'critical' : gasVal >= 250 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [gasVal],
        hardwarePin: 'ADC1_CH0 (MQ-2)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      },
      {
        id: 'flame_optical',
        name: 'UV/IR Flame Detector',
        category: 'flame',
        value: flameVal,
        unit: 'STATE',
        minRange: 0,
        maxRange: 1,
        warningThreshold: 1,
        criticalThreshold: 1,
        status: flameVal === null ? 'unknown' : flameVal === 1 ? 'critical' : 'optimal',
        trend: 'stable',
        history: [flameVal],
        hardwarePin: 'GPIO 15 (KY-026)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      },
      {
        id: 'pressure_steam',
        name: 'Boiler Steam Pressure',
        category: 'pressure',
        value: pressVal,
        unit: 'bar',
        minRange: 0,
        maxRange: 10,
        warningThreshold: 7.5,
        criticalThreshold: 9.0,
        status: pressVal === null ? 'unknown' : pressVal >= 9.0 ? 'critical' : pressVal >= 7.5 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [pressVal],
        hardwarePin: 'I2C (BMP280)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      },
      {
        id: 'vibration_turbine',
        name: 'Turbine Vibration Index',
        category: 'vibration',
        value: vibVal,
        unit: 'mm/s',
        minRange: 0,
        maxRange: 15,
        warningThreshold: 4.5,
        criticalThreshold: 7.0,
        status: vibVal === null ? 'unknown' : vibVal >= 7.0 ? 'critical' : vibVal >= 4.5 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [vibVal],
        hardwarePin: 'I2C (MPU6050)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource
      }
    ];

    this.callbacks.onTelemetryUpdate(updatedSensors, deviceTimestamp, packetSource);
  }

  // Register Android Device FCM Push Notification Token with FastAPI
  public async registerFcmToken(payload: FcmTokenRegistrationPayload): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/notifications/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch (e) {
      console.warn('FCM token registration failed with FastAPI:', e);
      return false;
    }
  }

  // Submit on-device vision or manual incident to FastAPI
  public async submitIncident(incident: Partial<IncidentRecord>): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident)
      });
      return resp.ok;
    } catch (e) {
      console.warn('Submit incident to FastAPI failed:', e);
      return false;
    }
  }

  // Ping test helper for FastAPI /api/health and /api/status
  public async testConnection(): Promise<{ ok: boolean; statusData?: any; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(id);

      const latencyMs = Math.round(performance.now() - start);

      if (resp.ok) {
        const data = await resp.json().catch(() => ({ status: 'healthy' }));
        return { ok: true, statusData: data, latencyMs };
      } else {
        return { ok: false, latencyMs, error: `Server returned HTTP ${resp.status}` };
      }
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: e.name === 'AbortError' ? 'Connection timed out' : 'Could not reach server' };
    }
  }
}
