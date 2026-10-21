import React, { useState, useEffect, useRef } from 'react';
import { 
  SensorReading, 
  SystemSafetyState, 
  ConnectionStatus, 
  IncidentRecord, 
  AiDetection, 
  DeviceConfig,
  EmergencyAlert,
  RestrictedZonePolygon,
  BackendStatusResponse,
  TelemetryHistoryPoint
} from './types/safeplant';
import { 
  initialSensors, 
  initialDetections, 
  initialIncidents, 
  initialDeviceConfig,
  defaultRestrictedPolygon 
} from './data/mockData';
import { AndroidFrame, MainNavDestination } from './components/AndroidFrame';
import { HomeScreen } from './components/screens/HomeScreen';
import { MonitorScreen } from './components/screens/MonitorScreen';
import { VisionScreen } from './components/screens/VisionScreen';
import { IncidentsScreen } from './components/screens/IncidentsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ComposeCodeModal } from './components/ComposeCodeModal';
import { EmergencyAlertOverlay } from './components/EmergencyAlertOverlay';
import { FastApiNetworkClient } from './services/fastApiService';

export default function App() {
  // 4 Main Destinations + Settings top-bar action (Section 2 Requirement)
  const [activeTab, setActiveTab] = useState<MainNavDestination>('dashboard');
  const [previousTab, setPreviousTab] = useState<MainNavDestination>('dashboard');

  const [sensors, setSensors] = useState<SensorReading[]>(initialSensors);
  const [systemState, setSystemState] = useState<SystemSafetyState>('DISCONNECTED');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [incidents, setIncidents] = useState<IncidentRecord[]>(initialIncidents);
  const [detections, setDetections] = useState<AiDetection[]>(initialDetections);
  const [config, setConfig] = useState<DeviceConfig>(initialDeviceConfig);
  const [backendStatus, setBackendStatus] = useState<BackendStatusResponse | null>(null);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Active in-app emergency alert dialog
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<EmergencyAlert | null>(null);

  // Multi-vertex restricted zone polygon for CameraX Vision
  const [restrictedPolygon, setRestrictedPolygon] = useState<RestrictedZonePolygon>(defaultRestrictedPolygon);

  // Last successful telemetry timestamp
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState<string | null>(null);

  const clientRef = useRef<FastApiNetworkClient | null>(null);

  // Initialize FastAPI Network Client
  useEffect(() => {
    const client = new FastApiNetworkClient(
      config.fastApiUrl,
      {
        onTelemetryUpdate: (incomingSensors, deviceTimestamp, source) => {
          setLastTelemetryTimestamp(deviceTimestamp || new Date().toISOString());

          setSensors((prev) => {
            return incomingSensors.map((newSensor) => {
              const existing = prev.find((s) => s.id === newSensor.id);
              const prevHistory = existing ? existing.history.filter((v): v is number => v !== null) : [];
              const updatedHistory = newSensor.value !== null 
                ? [...prevHistory.slice(-15), newSensor.value]
                : prevHistory;

              return {
                ...newSensor,
                history: updatedHistory,
                deviceTimestamp: deviceTimestamp || existing?.deviceTimestamp,
                source: source || existing?.source
              };
            });
          });

          // Check for active flame or critical thresholds
          const hasFlame = incomingSensors.some((s) => s.category === 'flame' && s.value === 1);
          const hasCrit = incomingSensors.some((s) => s.status === 'critical');
          const hasWarn = incomingSensors.some((s) => s.status === 'warning');

          setSystemState(hasFlame || hasCrit ? 'CRITICAL' : hasWarn ? 'WARNING' : 'NOMINAL');
        },
        onConnectionStatusChange: (status, _message) => {
          setConnectionStatus(status);
          if (status === 'DISCONNECTED') {
            setSystemState('DISCONNECTED');
          } else if (status === 'STALE_DATA') {
            setSystemState('STALE_DATA');
          }
        },
        onIncidentsUpdate: (updatedIncidents) => {
          setIncidents(updatedIncidents);
        },
        onAiEventsUpdate: (events) => {
          setDetections(events);
        },
        onEmergencyAlert: (alert) => {
          setActiveEmergencyAlert(alert);
        },
        onBackendStatusUpdate: (status) => {
          setBackendStatus(status);
        }
      }
    );

    clientRef.current = client;
    client.start();

    // Fetch initial backend settings if available
    client.fetchSettings().then((settings) => {
      if (settings) {
        setConfig((prev) => ({ ...prev, ...settings }));
      }
    });

    return () => {
      client.stop();
    };
  }, []);

  // Update backend settings persistently
  const handleUpdateConfig = async (updated: Partial<DeviceConfig>): Promise<{ ok: boolean; error?: string }> => {
    if (clientRef.current) {
      const res = await clientRef.current.saveSettings(updated);
      if (res.ok) {
        setConfig((prev) => {
          const next = { ...prev, ...updated };
          if (updated.fastApiUrl && clientRef.current) {
            clientRef.current.setBaseUrl(updated.fastApiUrl);
          }
          if (updated.telemetryStaleTimeoutSec && clientRef.current) {
            clientRef.current.setStaleTimeout(updated.telemetryStaleTimeoutSec);
          }
          return next;
        });
      }
      return res;
    }
    setConfig((prev) => ({ ...prev, ...updated }));
    return { ok: true };
  };

  const handleReconnect = () => {
    if (clientRef.current) {
      clientRef.current.reconnect();
    }
  };

  const handleTestConnection = async () => {
    if (clientRef.current) {
      return await clientRef.current.testConnection();
    }
    return { ok: false, latencyMs: 0, error: 'Network client uninitialized' };
  };

  const handleFetchHistory = async (range: string): Promise<TelemetryHistoryPoint[]> => {
    if (clientRef.current) {
      return await clientRef.current.fetchTelemetryHistory(range);
    }
    return [];
  };

  // Test Emergency Alert Trigger
  const handleTriggerTestEmergencyAlert = () => {
    setActiveEmergencyAlert({
      id: `alert_test_${Date.now()}`,
      incidentId: 'inc_test_hazard',
      title: 'CRITICAL: Severe Combustible Vapor Hazard',
      severity: 'CRITICAL',
      message: 'Combustible hydrocarbon vapor concentration reached 2650 Raw ADC in Solvents Bay. Automated ventilation extraction commanded.',
      sensorSource: 'MQ-2 Gas Sensor (ADC1_CH0)',
      actualMetric: '2650 Raw ADC (Ceiling 2500)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      zone: 'Zone B-2 · Solvents Bay',
      safetyInstructions: [
        'Evacuate personnel from designated hazardous perimeter.',
        'Activate emergency extraction exhaust scrubbers.',
        'Isolate primary solvent transfer line at Valve 4.'
      ],
      acknowledged: false
    });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setActiveEmergencyAlert(null);
    if (clientRef.current) {
      clientRef.current.acknowledgeIncident(alertId, 'Lead Safety Officer (Alert Overlay)');
    }
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === alertId || activeEmergencyAlert?.incidentId === inc.id
          ? {
              ...inc,
              status: 'acknowledged',
              acknowledged: true,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: 'Lead Safety Officer (Alert Overlay)'
            }
          : inc
      )
    );
  };

  const handleViewIncidentDetails = (_incidentId: string) => {
    setActiveEmergencyAlert(null);
    setActiveTab('incidents');
  };

  const handleAcknowledgeIncident = (id: string, acknowledgedBy?: string) => {
    if (clientRef.current) {
      clientRef.current.acknowledgeIncident(id, acknowledgedBy || 'Lead Safety Officer');
    }
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              status: 'acknowledged',
              acknowledged: true,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: acknowledgedBy || 'Lead Safety Officer'
            }
          : inc
      )
    );
  };

  const handleResolveIncident = (id: string, notes?: string) => {
    if (clientRef.current) {
      clientRef.current.resolveIncident(id, notes);
    }
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              status: 'resolved',
              resolved: true,
              resolvedAt: new Date().toISOString(),
              resolutionNotes: notes
            }
          : inc
      )
    );
  };

  // Dispatch Vision Incident to FastAPI
  const handleSubmitVisionIncident = async (incident: Partial<IncidentRecord>): Promise<boolean> => {
    if (clientRef.current) {
      const ok = await clientRef.current.submitIncident(incident);
      if (ok && incident.title) {
        setIncidents((prev) => [incident as IncidentRecord, ...prev]);
        setActiveEmergencyAlert({
          id: incident.id || `vis_alert_${Date.now()}`,
          incidentId: incident.id || `inc_${Date.now()}`,
          title: incident.title,
          severity: 'WARNING',
          message: incident.description || 'An individual was detected within the automated restricted safety perimeter.',
          sensorSource: 'CameraX Edge Vision',
          actualMetric: incident.triggeringValue || 'Zone Intrusion Confirmed',
          timestamp: incident.timestamp || 'Just now',
          zone: incident.zone || 'Robotic Cell Perimeter',
          safetyInstructions: [
            'Halt automated machinery in restricted perimeter.',
            'Direct individual to exit marked yellow perimeter lines.',
            'Reset interlock switch before resuming production.'
          ],
          acknowledged: false
        });
      }
      return ok;
    }
    return false;
  };

  // Provider Dispatch Testing
  const handleTestFcmPush = async () => {
    if (clientRef.current) {
      return await clientRef.current.testFcmBackend();
    }
    return { delivered: false, status: 'UNINITIALIZED', message: 'Client not ready' };
  };

  const handleTestSms = async () => {
    if (clientRef.current) {
      return await clientRef.current.testSmsBackend();
    }
    return { delivered: false, status: 'UNINITIALIZED', message: 'Client not ready' };
  };

  const handleOpenSettings = () => {
    setPreviousTab(activeTab);
    setActiveTab('settings');
  };

  const handleCloseSettings = () => {
    setActiveTab(previousTab === 'settings' ? 'dashboard' : previousTab);
  };

  const unacknowledgedIncidents = incidents.filter((i) => i.status === 'open').length;

  return (
    <div className="w-full min-h-screen bg-[#07090C]">
      {/* In-App Emergency Alert Overlay (Active on confirmed hazard) */}
      <EmergencyAlertOverlay
        alert={activeEmergencyAlert}
        onAcknowledge={handleAcknowledgeAlert}
        onViewIncidentDetails={handleViewIncidentDetails}
        reducedMotion={config.reducedMotion}
      />

      <AndroidFrame
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemState={systemState}
        connectionStatus={connectionStatus}
        incidentCount={unacknowledgedIncidents}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        onOpenSettings={handleOpenSettings}
        onTriggerTestEmergencyAlert={handleTriggerTestEmergencyAlert}
      >
        {/* Destination 1: Dashboard (Section 3) */}
        {activeTab === 'dashboard' && (
          <HomeScreen
            sensors={sensors}
            systemState={systemState}
            incidents={incidents}
            connectionStatus={connectionStatus}
            backendStatus={backendStatus}
            config={config}
            lastTelemetryTimestamp={lastTelemetryTimestamp}
            tempUnit={tempUnit}
            onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
            onNavigateTab={setActiveTab}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {/* Destination 2: Readings & Historical Analytics (Section 4) */}
        {activeTab === 'readings' && (
          <MonitorScreen
            sensors={sensors}
            connectionStatus={connectionStatus}
            config={config}
            incidents={incidents}
            tempUnit={tempUnit}
            onFetchHistory={handleFetchHistory}
          />
        )}

        {/* Destination 3: Phone Camera Vision (Section 5 & 6) */}
        {activeTab === 'camera' && (
          <VisionScreen
            detections={detections}
            restrictedPolygon={restrictedPolygon}
            config={config}
            onUpdateRestrictedPolygon={setRestrictedPolygon}
            onSubmitVisionIncident={handleSubmitVisionIncident}
          />
        )}

        {/* Destination 4: Incidents Audit Log & Lifecycle (Section 8) */}
        {activeTab === 'incidents' && (
          <IncidentsScreen
            incidents={incidents}
            onAcknowledgeIncident={handleAcknowledgeIncident}
            onResolveIncident={handleResolveIncident}
          />
        )}

        {/* Compact Settings Screen (Opened from Top Bar) */}
        {activeTab === 'settings' && (
          <SettingsScreen
            config={config}
            onUpdateConfig={handleUpdateConfig}
            connectionStatus={connectionStatus}
            lastTelemetryTimestamp={lastTelemetryTimestamp}
            onTestConnection={handleTestConnection}
            onReconnect={handleReconnect}
            onClose={handleCloseSettings}
            onTestFcmPush={handleTestFcmPush}
            onTestSms={handleTestSms}
          />
        )}
      </AndroidFrame>

      {/* Kotlin / Jetpack Compose Source Code Inspector */}
      <ComposeCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
