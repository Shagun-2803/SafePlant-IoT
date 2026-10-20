import React, { useState, useEffect, useRef } from 'react';
import { 
  SensorReading, 
  SystemSafetyState, 
  ConnectionStatus, 
  IncidentRecord, 
  AiDetection, 
  DeviceConfig,
  EmergencyAlert,
  RestrictedZoneBoundary
} from './types/safeplant';
import { 
  initialSensors, 
  initialDetections, 
  initialIncidents, 
  initialDeviceConfig,
  defaultRestrictedZone 
} from './data/mockData';
import { AndroidFrame } from './components/AndroidFrame';
import { HomeScreen } from './components/screens/HomeScreen';
import { MonitorScreen } from './components/screens/MonitorScreen';
import { VisionScreen } from './components/screens/VisionScreen';
import { IncidentsScreen } from './components/screens/IncidentsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ComposeCodeModal } from './components/ComposeCodeModal';
import { EmergencyAlertOverlay } from './components/EmergencyAlertOverlay';
import { FastApiNetworkClient } from './services/fastApiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitor' | 'vision' | 'incidents' | 'settings'>('overview');
  const [sensors, setSensors] = useState<SensorReading[]>(initialSensors);
  const [systemState, setSystemState] = useState<SystemSafetyState>('NOMINAL');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [incidents, setIncidents] = useState<IncidentRecord[]>(initialIncidents);
  const [detections, setDetections] = useState<AiDetection[]>(initialDetections);
  const [config, setConfig] = useState<DeviceConfig>(initialDeviceConfig);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Active in-app emergency alert dialog
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<EmergencyAlert | null>(null);

  // Restricted zone configuration for Phone Camera Computer Vision
  const [restrictedZone, setRestrictedZone] = useState<RestrictedZoneBoundary>(defaultRestrictedZone);

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
                ? [...prevHistory.slice(-7), newSensor.value]
                : prevHistory;

              return {
                ...newSensor,
                history: updatedHistory,
                deviceTimestamp: deviceTimestamp || existing?.deviceTimestamp,
                source: source || existing?.source
              };
            });
          });

          // Derive overall safety state from actual readings
          const hasCrit = incomingSensors.some((s) => s.status === 'critical');
          const hasWarn = incomingSensors.some((s) => s.status === 'warning');
          setSystemState(hasCrit ? 'CRITICAL' : hasWarn ? 'WARNING' : 'NOMINAL');
        },
        onConnectionStatusChange: (status, message) => {
          setConnectionStatus(status);
        },
        onIncidentsUpdate: (updatedIncidents) => {
          setIncidents(updatedIncidents);
        },
        onAiEventsUpdate: (events) => {
          setDetections(events);
        },
        onEmergencyAlert: (alert) => {
          setActiveEmergencyAlert(alert);
        }
      }
    );

    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
    };
  }, []);

  // Update backend base URL
  const handleUpdateConfig = (updated: Partial<DeviceConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      if (updated.fastApiUrl && clientRef.current) {
        clientRef.current.setBaseUrl(updated.fastApiUrl);
      }
      return next;
    });
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

  // Test Emergency Alert Trigger
  const handleTriggerTestEmergencyAlert = () => {
    setActiveEmergencyAlert({
      id: `alert_test_${Date.now()}`,
      incidentId: 'inc_392',
      title: 'CRITICAL: Combustible Gas Explosion Hazard',
      severity: 'CRITICAL',
      message: 'Combustible hydrocarbon vapor concentration exceeded 500 PPM threshold in Solvents Bay. Immediate ventilation extraction required.',
      sensorSource: 'MQ-2 Gas Sensor (ADC1_CH0)',
      actualMetric: '520 PPM (Ceiling 500 PPM)',
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
    // Also mark incident acknowledged if matched
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === alertId || activeEmergencyAlert?.incidentId === inc.id
          ? {
              ...inc,
              acknowledged: true,
              acknowledgedBy: 'Lead Safety Officer (Acknowledged via In-App Alert)'
            }
          : inc
      )
    );
  };

  const handleViewIncidentDetails = (incidentId: string) => {
    setActiveEmergencyAlert(null);
    setActiveTab('incidents');
  };

  const handleAcknowledgeIncident = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              acknowledged: true,
              resolved: true,
              acknowledgedBy: 'Lead Safety Officer'
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
        // Trigger emergency alert dialog for perimeter entry
        setActiveEmergencyAlert({
          id: incident.id || `vis_alert_${Date.now()}`,
          incidentId: incident.id || `inc_${Date.now()}`,
          title: 'Restricted Safety Zone Breach',
          severity: 'WARNING',
          message: 'An individual was detected within the automated robotic cell perimeter without authorization.',
          sensorSource: 'Phone-Camera Vision (CameraX)',
          actualMetric: 'Zone Entry Verified',
          timestamp: incident.timestamp || 'Just now',
          zone: incident.zone || 'Robotic Cell A-2',
          safetyInstructions: [
            'Halt automated machinery in Cell A-2.',
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

  // Test FCM Push Registration
  const handleTestFcmPush = async (): Promise<boolean> => {
    if (!config.fcmToken) {
      console.warn('FCM token is not configured in web prototype.');
      return false;
    }
    if (clientRef.current) {
      return await clientRef.current.registerFcmToken({
        device_id: config.deviceId,
        fcm_token: config.fcmToken,
        platform: 'android',
        app_version: '2.4.1',
        registered_at: new Date().toISOString()
      });
    }
    return false;
  };

  const unacknowledgedIncidents = incidents.filter((i) => !i.acknowledged).length;

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
        onTriggerTestEmergencyAlert={handleTriggerTestEmergencyAlert}
      >
        {activeTab === 'overview' && (
          <HomeScreen
            sensors={sensors}
            systemState={systemState}
            incidents={incidents}
            connectionStatus={connectionStatus}
            tempUnit={tempUnit}
            onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'monitor' && (
          <MonitorScreen
            sensors={sensors}
            connectionStatus={connectionStatus}
            tempUnit={tempUnit}
            onSimulateStateChange={setConnectionStatus}
          />
        )}

        {activeTab === 'vision' && (
          <VisionScreen
            detections={detections}
            restrictedZone={restrictedZone}
            onUpdateRestrictedZone={(zone) => setRestrictedZone((z) => ({ ...z, ...zone }))}
            onSubmitVisionIncident={handleSubmitVisionIncident}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsScreen
            incidents={incidents}
            onAcknowledgeIncident={handleAcknowledgeIncident}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            config={config}
            onUpdateConfig={handleUpdateConfig}
            connectionStatus={connectionStatus}
            lastTelemetryTimestamp={lastTelemetryTimestamp}
            onTestConnection={handleTestConnection}
            onReconnect={handleReconnect}
            onTriggerTestEmergencyAlert={handleTriggerTestEmergencyAlert}
            onTestFcmPush={handleTestFcmPush}
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
