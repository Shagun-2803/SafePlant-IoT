import React, { useState, useEffect } from 'react';
import { 
  SensorReading, 
  SystemSafetyState, 
  OperatingMode, 
  ConnectionStatus, 
  IncidentRecord, 
  AiDetection, 
  DeviceConfig 
} from './types/safeplant';
import { 
  initialSensors, 
  initialDetections, 
  initialIncidents, 
  initialDeviceConfig 
} from './data/mockData';
import { AndroidFrame } from './components/AndroidFrame';
import { HomeScreen } from './components/screens/HomeScreen';
import { MonitorScreen } from './components/screens/MonitorScreen';
import { VisionScreen } from './components/screens/VisionScreen';
import { IncidentsScreen } from './components/screens/IncidentsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ComposeCodeModal } from './components/ComposeCodeModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitor' | 'vision' | 'incidents' | 'settings'>('overview');
  const [sensors, setSensors] = useState<SensorReading[]>(initialSensors);
  const [systemState, setSystemState] = useState<SystemSafetyState>('NOMINAL');
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('DEMO');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTED');
  const [incidents, setIncidents] = useState<IncidentRecord[]>(initialIncidents);
  const [detections, setDetections] = useState<AiDetection[]>(initialDetections);
  const [config, setConfig] = useState<DeviceConfig>(initialDeviceConfig);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Subtle realistic telemetry drift in Demo mode
  useEffect(() => {
    if (operatingMode !== 'DEMO' || connectionStatus !== 'CONNECTED') return;

    const interval = setInterval(() => {
      setSensors((prev) =>
        prev.map((sensor) => {
          // If sensor is in simulated alarm state, preserve it
          if (sensor.status === 'critical' || sensor.status === 'warning') return sensor;

          let delta = (Math.random() - 0.5) * 0.2;
          let newVal = sensor.value;

          if (sensor.category === 'temperature') {
            newVal = Math.round((sensor.value + delta) * 10) / 10;
            newVal = Math.max(23.5, Math.min(26.0, newVal));
          } else if (sensor.category === 'humidity') {
            newVal = Math.round((sensor.value + delta * 2) * 10) / 10;
            newVal = Math.max(46.0, Math.min(50.5, newVal));
          } else if (sensor.category === 'gas') {
            newVal = Math.round(sensor.value + (Math.random() - 0.5) * 2);
            newVal = Math.max(34, Math.min(42, newVal));
          }

          const newHistory = [...sensor.history.slice(1), newVal];
          return {
            ...sensor,
            value: newVal,
            history: newHistory,
            lastUpdated: 'Just now'
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [operatingMode, connectionStatus]);

  // Hazard Simulation Handler
  const handleSimulateHazard = (type: 'gas' | 'flame' | 'temp' | 'reset') => {
    if (type === 'reset') {
      setSensors(initialSensors);
      setSystemState('NOMINAL');
      return;
    }

    if (type === 'gas') {
      setSensors((prev) =>
        prev.map((s) =>
          s.category === 'gas'
            ? {
                ...s,
                value: 320,
                status: 'warning',
                history: [...s.history.slice(1), 320],
                lastUpdated: 'Just now'
              }
            : s
        )
      );
      setSystemState('WARNING');

      // Add audit incident
      const newInc: IncidentRecord = {
        id: `inc_${Date.now()}`,
        timestamp: 'Just now',
        title: 'Elevated Hydrocarbon Vapor Detected',
        description: 'Vapor reading reached 320 PPM in Zone B-2, exceeding warning threshold (250 PPM). Auxiliary ventilation triggered.',
        zone: 'Zone B-2 · Solvents Bay',
        severity: 'medium',
        sensorTrigger: 'MQ-2 Gas Sensor (ADC1_CH0)',
        peakValue: '320 PPM',
        acknowledged: false,
        resolved: false
      };
      setIncidents((prev) => [newInc, ...prev]);
    } else if (type === 'flame') {
      setSensors((prev) =>
        prev.map((s) =>
          s.category === 'flame'
            ? {
                ...s,
                value: 1,
                status: 'critical',
                lastUpdated: 'Just now'
              }
            : s
        )
      );
      setSystemState('CRITICAL');

      // Add critical incident
      const newInc: IncidentRecord = {
        id: `inc_${Date.now()}`,
        timestamp: 'Just now',
        title: 'CRITICAL: UV/IR Optical Flame Triggered',
        description: 'Dual-band infrared flicker detected on Pin 15. Automated foam suppression pre-charge armed.',
        zone: 'Refinery Tower A-4',
        severity: 'critical',
        sensorTrigger: 'KY-026 Flame Sensor (GPIO 15)',
        peakValue: 'FLAME CONFIRMED',
        acknowledged: false,
        resolved: false
      };
      setIncidents((prev) => [newInc, ...prev]);
    } else if (type === 'temp') {
      setSensors((prev) =>
        prev.map((s) =>
          s.category === 'temperature'
            ? {
                ...s,
                value: 64.5,
                status: 'critical',
                history: [...s.history.slice(1), 64.5],
                lastUpdated: 'Just now'
              }
            : s
        )
      );
      setSystemState('CRITICAL');
    }
  };

  const handleToggleMode = () => {
    const nextMode = operatingMode === 'DEMO' ? 'HARDWARE' : 'DEMO';
    setOperatingMode(nextMode);
    setConfig((c) => ({ ...c, mode: nextMode }));
  };

  const handleAcknowledgeIncident = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              acknowledged: true,
              resolved: true,
              acknowledgedBy: 'Lead Safety Officer (Shift 1)'
            }
          : inc
      )
    );
  };

  const handleTestConnection = async (): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return true;
  };

  const unacknowledgedIncidents = incidents.filter((i) => !i.acknowledged).length;

  return (
    <div className="w-full min-h-screen bg-[#07090C]">
      <AndroidFrame
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemState={systemState}
        operatingMode={operatingMode}
        onToggleMode={handleToggleMode}
        connectionStatus={connectionStatus}
        incidentCount={unacknowledgedIncidents}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        onSimulateHazard={handleSimulateHazard}
      >
        {activeTab === 'overview' && (
          <HomeScreen
            sensors={sensors}
            systemState={systemState}
            incidents={incidents}
            connectionStatus={connectionStatus}
            operatingMode={operatingMode}
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
          <VisionScreen detections={detections} />
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
            onUpdateConfig={(up) => setConfig((prev) => ({ ...prev, ...up }))}
            connectionStatus={connectionStatus}
            onTestConnection={handleTestConnection}
            onSimulateState={setConnectionStatus}
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
