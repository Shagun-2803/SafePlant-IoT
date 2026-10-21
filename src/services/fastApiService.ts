import { 
  SensorReading, 
  ConnectionStatus, 
  IncidentRecord, 
  AiDetection, 
  TelemetryPayloadDto, 
  WebSocketMessage,
  EmergencyAlert,
  FcmTokenRegistrationPayload,
  BackendStatusResponse,
  DeviceConfig,
  TelemetryHistoryPoint
} from '../types/safeplant';

export interface FastApiCallbacks {
  onTelemetryUpdate: (sensors: SensorReading[], timestamp?: string, source?: 'esp32' | 'vision' | 'unknown') => void;
  onConnectionStatusChange: (status: ConnectionStatus, message?: string) => void;
  onIncidentsUpdate: (incidents: IncidentRecord[]) => void;
  onAiEventsUpdate: (detections: AiDetection[]) => void;
  onEmergencyAlert: (alert: EmergencyAlert) => void;
  onBackendStatusUpdate?: (status: BackendStatusResponse) => void;
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

  // Stale data watchdog (configurable)
  private lastTelemetryTime = 0;
  private watchdogTimer: any = null;
  private staleTimeoutMs = 8000;

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

  public setStaleTimeout(seconds: number) {
    this.staleTimeoutMs = Math.max(3000, seconds * 1000);
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
    } catch {
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

      const [telemetryResp, incidentsResp, statusResp] = await Promise.all([
        fetch(`${this.baseUrl}/api/telemetry/latest`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        }),
        fetch(`${this.baseUrl}/api/incidents`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        }).catch(() => null),
        fetch(`${this.baseUrl}/api/status`, {
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
      } else if (telemetryResp.status === 404) {
        // Explicit honest state: No hardware packet received yet
        this.callbacks.onConnectionStatusChange('NO_DATA', 'Backend reachable. Awaiting ESP32 hardware telemetry...');
      }

      if (incidentsResp && incidentsResp.ok) {
        const incData = await incidentsResp.json();
        if (Array.isArray(incData)) {
          this.callbacks.onIncidentsUpdate(incData);
        }
      }

      if (statusResp && statusResp.ok) {
        const statusData = await statusResp.json();
        if (this.callbacks.onBackendStatusUpdate) {
          this.callbacks.onBackendStatusUpdate(statusData);
        }
      }
    } catch {
      // If neither WS nor REST responds
      if (Date.now() - this.lastTelemetryTime > this.staleTimeoutMs) {
        this.callbacks.onConnectionStatusChange('DISCONNECTED', `Backend unreachable at ${this.baseUrl}`);
      }
    }
  }

  // Stale Data Watchdog (> staleTimeoutMs with no incoming telemetry packet)
  private startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    this.watchdogTimer = setInterval(() => {
      if (this.lastTelemetryTime > 0 && Date.now() - this.lastTelemetryTime > this.staleTimeoutMs) {
        this.callbacks.onConnectionStatusChange(
          'STALE_DATA',
          `Hardware telemetry stale (> ${(this.staleTimeoutMs / 1000).toFixed(0)}s without packet)`
        );
      }
    }, 1500);
  }

  private parseIncomingMessage(rawText: string) {
    try {
      const msg: WebSocketMessage = JSON.parse(rawText);

      switch (msg.type) {
        case 'INITIAL_SNAPSHOT':
          if (msg.data) {
            this.processTelemetryPayload(msg.data);
          }
          if (msg.incidents && Array.isArray(msg.incidents)) {
            this.callbacks.onIncidentsUpdate(msg.incidents);
          }
          break;

        case 'TELEMETRY_UPDATE':
          if (msg.data) {
            this.processTelemetryPayload(msg.data);
          }
          break;

        case 'INCIDENT_UPDATE':
          if (msg.incidents && Array.isArray(msg.incidents)) {
            this.callbacks.onIncidentsUpdate(msg.incidents);
          }
          break;

        case 'EMERGENCY_ALERT':
          if (msg.alert) {
            this.checkAndTriggerAlert(msg.alert);
          }
          break;

        case 'CONNECTION_STATUS':
          if (msg.status) {
            this.callbacks.onConnectionStatusChange(msg.status as ConnectionStatus);
          }
          break;

        default:
          if ((msg as any).temperature_c !== undefined || (msg as any).temperature !== undefined) {
            this.processTelemetryPayload(msg as any);
          }
          break;
      }
    } catch (e) {
      console.warn('Failed to parse incoming WebSocket message:', e);
    }
  }

  private checkAndTriggerAlert(alert: EmergencyAlert) {
    if (!this.handledAlertIds.has(alert.id)) {
      this.handledAlertIds.add(alert.id);
      this.callbacks.onEmergencyAlert(alert);
    }
  }

  private processTelemetryPayload(payload: any) {
    if (!payload || typeof payload !== 'object') return;

    const deviceTimestamp = payload.timestamp || new Date().toISOString();
    const packetSource: 'esp32' | 'vision' | 'unknown' = payload.source === 'camera_vision' ? 'vision' : 'esp32';

    const parseSensorVal = (val: any): number | null => {
      if (val === null || val === undefined || val === 'unknown' || val === 'UNKNOWN' || val === '') {
        return null;
      }
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const tempVal = parseSensorVal(payload.temperature_c ?? payload.temperature ?? payload.temp);
    const humVal = parseSensorVal(payload.humidity_rh ?? payload.humidity ?? payload.hum);
    const gasVal = parseSensorVal(payload.gas_ppm ?? payload.gas_raw ?? payload.gas);
    
    let flameVal: number | null = null;
    if (payload.flame_detected !== undefined && payload.flame_detected !== null) {
      flameVal = payload.flame_detected === true || payload.flame_detected === 1 ? 1 : 0;
    } else if (payload.flame !== undefined && payload.flame !== null) {
      flameVal = Number(payload.flame) > 0 ? 1 : 0;
    }

    const rssi = parseSensorVal(payload.rssi_dbm ?? payload.rssi) ?? 0;

    // Build the 4 core hardware sensor representations
    const updatedSensors: SensorReading[] = [
      {
        id: 'temp_dht11',
        name: 'Ambient Temperature (DHT11)',
        category: 'temperature',
        value: tempVal,
        unit: '°C',
        minRange: 0,
        maxRange: 50,
        warningThreshold: 45.0,
        criticalThreshold: 50.0,
        status: tempVal === null ? 'unknown' : tempVal >= 50 ? 'critical' : tempVal >= 45 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [tempVal],
        hardwarePin: 'GPIO 4 (DHT11)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource,
        calibrationStatus: 'calibrated'
      },
      {
        id: 'humidity_dht11',
        name: 'Relative Humidity (DHT11)',
        category: 'humidity',
        value: humVal,
        unit: '%RH',
        minRange: 20,
        maxRange: 90,
        warningThreshold: 75.0,
        criticalThreshold: 85.0,
        status: humVal === null ? 'unknown' : humVal >= 85 ? 'critical' : humVal >= 75 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [humVal],
        hardwarePin: 'GPIO 4 (DHT11)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource,
        calibrationStatus: 'calibrated'
      },
      {
        id: 'gas_mq2',
        name: 'Gas / Smoke (MQ-2)',
        category: 'gas',
        value: gasVal,
        unit: 'Raw ADC',
        minRange: 0,
        maxRange: 4095,
        warningThreshold: 1500,
        criticalThreshold: 2500,
        status: gasVal === null ? 'unknown' : gasVal >= 2500 ? 'critical' : gasVal >= 1500 ? 'warning' : 'optimal',
        trend: 'stable',
        history: [gasVal],
        hardwarePin: 'ADC1_CH0 (Pin 36)',
        signalDbm: rssi,
        lastUpdated: 'Live',
        deviceTimestamp,
        source: packetSource,
        calibrationStatus: 'raw' // Uncalibrated raw ADC reading
      },
      {
        id: 'flame_optical',
        name: 'Optical Flame Detector',
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
        source: packetSource,
        calibrationStatus: 'calibrated'
      }
    ];

    this.callbacks.onTelemetryUpdate(updatedSensors, deviceTimestamp, packetSource);
  }

  // Fetch telemetry history with time-range filtering: 1h, 6h, 24h, 7d
  public async fetchTelemetryHistory(range: string = '1h'): Promise<TelemetryHistoryPoint[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/telemetry/history?range=${range}&limit=100`, {
        headers: { Accept: 'application/json' }
      });
      if (resp.ok) {
        const json = await resp.json();
        return json.history || [];
      }
    } catch (e) {
      console.warn('Failed to fetch telemetry history:', e);
    }
    return [];
  }

  // Incident Lifecycle: Acknowledge
  public async acknowledgeIncident(id: string, acknowledgedBy: string = 'Safety Officer'): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/incidents/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // Incident Lifecycle: Resolve
  public async resolveIncident(id: string, notes: string = 'Condition verified resolved'): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // Section 7: Fetch persistent settings
  public async fetchSettings(): Promise<Partial<DeviceConfig> | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/settings`, {
        headers: { Accept: 'application/json' }
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Failed to fetch settings from backend:', e);
    }
    return null;
  }

  // Section 7: Update persistent settings with validation
  public async saveSettings(settings: Partial<DeviceConfig>): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (resp.ok) {
        return { ok: true };
      }
      const data = await resp.json().catch(() => ({}));
      return { ok: false, error: data.error || `Error ${resp.status}` };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error saving settings' };
    }
  }

  // Ingest Camera Intrusion Event
  public async submitAiEvent(event: { polygon_id: string; people_count: number; confidence: number; timestamp?: string }): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/ai/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          idempotency_key: `intrusion_${event.polygon_id}_${Math.floor(Date.now() / 15000)}`
        })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // Ingest Real ESP32 Telemetry packet (or testing harness)
  public async sendTelemetryPacket(payload: object): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch {
      return false;
    }
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
    } catch {
      return false;
    }
  }

  // Test FCM backend dispatch
  public async testFcmBackend(): Promise<{ delivered: boolean; status: string; message?: string }> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/notifications/test-fcm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await resp.json();
    } catch (e: any) {
      return { delivered: false, status: 'ERROR', message: e.message };
    }
  }

  // Test SMS backend dispatch (MSG91)
  public async testSmsBackend(): Promise<{ delivered: boolean; status: string; message?: string }> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/notifications/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await resp.json();
    } catch (e: any) {
      return { delivered: false, status: 'ERROR', message: e.message };
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
    } catch {
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
