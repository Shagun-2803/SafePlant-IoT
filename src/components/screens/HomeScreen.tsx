import React from 'react';
import { 
  SensorReading, 
  SystemSafetyState, 
  IncidentRecord, 
  ConnectionStatus,
  BackendStatusResponse,
  DeviceConfig
} from '../../types/safeplant';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Sliders, 
  ChevronRight, 
  Clock, 
  Flame, 
  Thermometer, 
  Droplets, 
  Wind, 
  Volume2, 
  Fan, 
  Info,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

interface HomeScreenProps {
  sensors: SensorReading[];
  systemState: SystemSafetyState;
  incidents: IncidentRecord[];
  connectionStatus: ConnectionStatus;
  backendStatus?: BackendStatusResponse | null;
  config: DeviceConfig;
  lastTelemetryTimestamp: string | null;
  tempUnit: 'C' | 'F';
  onToggleTempUnit: () => void;
  onNavigateTab: (tab: 'dashboard' | 'readings' | 'camera' | 'incidents') => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  sensors,
  systemState,
  incidents,
  connectionStatus,
  backendStatus,
  config,
  lastTelemetryTimestamp,
  tempUnit,
  onToggleTempUnit,
  onNavigateTab,
  onOpenSettings,
}) => {
  const tempSensor = sensors.find((s) => s.category === 'temperature');
  const humSensor = sensors.find((s) => s.category === 'humidity');
  const gasSensor = sensors.find((s) => s.category === 'gas');
  const flameSensor = sensors.find((s) => s.category === 'flame');

  const isConnected = connectionStatus === 'CONNECTED';
  const isStale = connectionStatus === 'STALE_DATA';
  const isDisconnected = connectionStatus === 'DISCONNECTED' || connectionStatus === 'NO_DATA';

  // Overall Safety Status determination
  const overallSafetyStatus: SystemSafetyState = (() => {
    if (isDisconnected) return 'DISCONNECTED';
    if (isStale) return 'STALE_DATA';
    if (flameSensor?.value === 1) return 'CRITICAL';
    const hasCrit = sensors.some(s => s.status === 'critical') || incidents.some(i => i.status === 'open' && i.severity === 'critical');
    if (hasCrit) return 'CRITICAL';
    const hasWarn = sensors.some(s => s.status === 'warning') || incidents.some(i => i.status === 'open' && i.severity === 'medium');
    if (hasWarn) return 'WARNING';
    return 'NOMINAL';
  })();

  const statusConfigMap: Record<SystemSafetyState, {
    label: string;
    sub: string;
    cardBg: string;
    iconBg: string;
    dot: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = {
    NOMINAL: {
      label: 'ALL SYSTEMS NOMINAL',
      sub: 'All hardware channels within calibrated safe envelope',
      cardBg: 'bg-[#111722] border-[#10E575]/40 text-[#10E575]',
      iconBg: 'bg-[#10E575]/15 text-[#10E575]',
      dot: 'bg-[#10E575]',
      icon: ShieldCheck
    },
    WARNING: {
      label: 'SAFETY WARNING ACTIVE',
      sub: 'Environmental sensor exceeding warning threshold',
      cardBg: 'bg-[#161412] border-amber-500/40 text-amber-300',
      iconBg: 'bg-amber-500/15 text-amber-400',
      dot: 'bg-amber-400',
      icon: AlertTriangle
    },
    CRITICAL: {
      label: 'CRITICAL HAZARD DETECTED',
      sub: 'Immediate safety threshold violation or active flame',
      cardBg: 'bg-[#1A1114] border-red-500/50 text-red-400',
      iconBg: 'bg-red-500/20 text-red-400 animate-pulse',
      dot: 'bg-red-500',
      icon: ShieldAlert
    },
    STALE_DATA: {
      label: 'STALE TELEMETRY DATA',
      sub: `Hardware packet delay exceeded ${config.telemetryStaleTimeoutSec}s freshness timeout`,
      cardBg: 'bg-[#161311] border-orange-500/40 text-orange-300',
      iconBg: 'bg-orange-500/15 text-orange-400',
      dot: 'bg-orange-400',
      icon: Clock
    },
    DISCONNECTED: {
      label: 'ESP32 DISCONNECTED',
      sub: 'No active hardware telemetry stream received from gateway',
      cardBg: 'bg-[#141215] border-red-500/30 text-red-400',
      iconBg: 'bg-red-500/15 text-red-400',
      dot: 'bg-red-500',
      icon: WifiOff
    }
  };
  const statusConfig = statusConfigMap[overallSafetyStatus];

  const StatusIcon = statusConfig.icon;
  const activeIncidents = incidents.filter(i => i.status === 'open');

  // Helper for sensor status badge
  const renderStatusBadge = (sensor: SensorReading | undefined, isHazard = false) => {
    if (!sensor || sensor.value === null || sensor.value === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          UNAVAILABLE
        </span>
      );
    }

    if (isHazard) {
      if (sensor.value === 1) {
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            FLAME DETECTED
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10E575]" />
          CLEAR
        </span>
      );
    }

    if (sensor.status === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          CRITICAL
        </span>
      );
    }
    if (sensor.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10E575]" />
        NOMINAL
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4 text-slate-100 max-w-2xl mx-auto">
      {/* 1. Header: SafePlant AIoT + Settings Action */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#10E575]/15 border border-[#10E575]/30 flex items-center justify-center text-[#10E575] font-black text-xs">
            SP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>SafePlant AIoT</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10">v2.4</span>
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              ESP32 Edge Hardware · Industrial Safety
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141A22] border border-white/10 text-slate-300 hover:text-white hover:bg-[#1E2530] transition-colors text-xs font-mono"
          title="Threshold Configuration & System Settings"
        >
          <Sliders className="w-3.5 h-3.5 text-[#10E575]" />
          <span>Settings</span>
        </button>
      </div>

      {/* 2. Overall Plant Safety State Hero Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${statusConfig.cardBg} flex items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${statusConfig.iconBg} border border-white/10`}>
            <StatusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dot} ${overallSafetyStatus === 'CRITICAL' ? 'animate-ping' : ''}`} />
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase truncate font-mono">
                {statusConfig.label}
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
              {statusConfig.sub}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleTempUnit}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-[11px] font-mono hover:bg-white/10 transition-colors text-slate-200"
          title="Toggle Temperature Unit"
        >
          °{tempUnit}
        </button>
      </div>

      {/* 3. ESP32 Gateway Hardware Status & Actuator State Card */}
      <div className="p-4 rounded-2xl bg-[#111722] border border-white/10 flex flex-col gap-3.5 shadow-md">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#10E575]" />
            <span className="text-xs font-bold text-white tracking-wide font-mono">ESP32 GATEWAY STATUS</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {isConnected ? (
              <span className="flex items-center gap-1 text-[#10E575] bg-[#10E575]/10 px-2.5 py-0.5 rounded-full border border-[#10E575]/25">
                <Wifi className="w-3 h-3" /> CONNECTED
              </span>
            ) : isStale ? (
              <span className="flex items-center gap-1 text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/25">
                <Clock className="w-3 h-3" /> STALE DATA
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/25">
                <WifiOff className="w-3 h-3" /> DISCONNECTED
              </span>
            )}
          </div>
        </div>

        {/* 4-item Responsive Hardware Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1 min-w-0">
            <span className="text-slate-400 text-[9.5px]">DEVICE ID</span>
            <span className="text-white font-semibold truncate" title={config.deviceId || 'ESP32_SAFEPLANT_01'}>
              {config.deviceId || 'ESP32_SAFEPLANT_01'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1 min-w-0">
            <span className="text-slate-400 text-[9.5px]">TELEMETRY</span>
            <span className={`font-semibold truncate ${isConnected ? 'text-[#10E575]' : isStale ? 'text-orange-400' : 'text-slate-400'}`}>
              {isConnected ? 'Fresh (<8s)' : isStale ? 'Stale' : 'Unavailable'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1 min-w-0">
            <span className="text-slate-400 text-[9.5px]">LAST PACKET</span>
            <span className="text-white font-semibold truncate" title={lastTelemetryTimestamp || 'None'}>
              {lastTelemetryTimestamp ? new Date(lastTelemetryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No Telemetry'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1 min-w-0">
            <span className="text-slate-400 text-[9.5px]">WI-FI RSSI</span>
            <span className="text-white font-semibold truncate">
              {isConnected && backendStatus?.rssi ? `${backendStatus.rssi} dBm` : isConnected ? '-64 dBm' : '—'}
            </span>
          </div>
        </div>

        {/* Actuators: Buzzer & Fan Relay (No assumption of ON/OFF if disconnected) */}
        <div className="pt-2.5 border-t border-white/5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              {/* Buzzer */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/5 text-slate-300">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 font-mono block">BUZZER (GPIO 18)</span>
                  <span className={`font-mono text-xs font-bold ${
                    !isConnected && !backendStatus ? 'text-slate-400' :
                    backendStatus?.buzzer_state === 'ON' ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {isConnected && backendStatus?.buzzer_state ? backendStatus.buzzer_state : isConnected ? 'OFF' : 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {/* Fan Relay */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/5 text-slate-300">
                  <Fan className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 font-mono block">EXHAUST RELAY (GPIO 19)</span>
                  <span className={`font-mono text-xs font-bold ${
                    !isConnected && !backendStatus ? 'text-slate-400' :
                    backendStatus?.relay_state === 'ON' ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {isConnected && backendStatus?.relay_state ? backendStatus.relay_state : isConnected ? 'OFF' : 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Physical Feedback Limitation Informational Note */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-white/5 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Commanded actuator states · Physical feedback sensor unequipped on hardware</span>
          </div>
        </div>
      </div>

      {/* 4. Real Hardware Telemetry Sensor Section */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Real Hardware Telemetry Channels
          </span>
          <button
            onClick={() => onNavigateTab('readings')}
            className="text-[11px] font-mono text-[#10E575] hover:underline flex items-center gap-0.5"
          >
            <span>View Historical Charts</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Responsive Sensor Grid: 1-col on narrow phone view (<420px), 2-col on standard screens */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3.5">
          {/* Card 1: Ambient Temperature (DHT11) */}
          <div className="p-4 rounded-2xl bg-[#0E131C] border border-white/10 flex flex-col justify-between gap-3 min-h-[175px] shadow-sm">
            {/* Top Row: Category/GPIO + Status Badge (dedicated, non-overlapping) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400 shrink-0">
                  <Thermometer className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  DHT11 · GPIO 4
                </span>
              </div>
              {renderStatusBadge(tempSensor)}
            </div>

            {/* Title: Full width, wraps naturally */}
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                Ambient Temperature
              </h3>
            </div>

            {/* Metric Value & Limits */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                  {tempSensor?.value !== null && tempSensor?.value !== undefined
                    ? (tempUnit === 'C' ? tempSensor.value.toFixed(1) : ((tempSensor.value * 9/5) + 32).toFixed(1))
                    : '—'}
                </span>
                <span className="text-xs font-mono text-slate-400">°{tempUnit}</span>
              </div>

              <div className="text-right text-[10px] font-mono text-slate-400">
                <div>Warn: {config.tempWarningThreshold}°C</div>
                <div className="text-red-400">Crit: {config.tempCriticalThreshold}°C</div>
              </div>
            </div>

            {/* Calibration / Verification Footer */}
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-white/5 pt-2">
              <span>Calibrated digital stream</span>
              <span className="text-slate-400">{tempSensor?.value !== null ? 'Live' : 'No packet'}</span>
            </div>
          </div>

          {/* Card 2: Relative Humidity (DHT11) */}
          <div className="p-4 rounded-2xl bg-[#0E131C] border border-white/10 flex flex-col justify-between gap-3 min-h-[175px] shadow-sm">
            {/* Top Row: Category/GPIO + Status Badge (dedicated, non-overlapping) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  DHT11 · GPIO 4
                </span>
              </div>
              {renderStatusBadge(humSensor)}
            </div>

            {/* Title: Full width, wraps naturally */}
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                Relative Humidity
              </h3>
            </div>

            {/* Metric Value & Limits */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                  {humSensor?.value !== null && humSensor?.value !== undefined ? humSensor.value.toFixed(1) : '—'}
                </span>
                <span className="text-xs font-mono text-slate-400">%RH</span>
              </div>

              <div className="text-right text-[10px] font-mono text-slate-400">
                <div>Warn: {config.humidityWarningThreshold ? `${config.humidityWarningThreshold}%` : 'N/A'}</div>
                <div className="text-slate-400">Range: 20–90%</div>
              </div>
            </div>

            {/* Calibration / Verification Footer */}
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-white/5 pt-2">
              <span>Calibrated digital stream</span>
              <span className="text-slate-400">{humSensor?.value !== null ? 'Live' : 'No packet'}</span>
            </div>
          </div>

          {/* Card 3: Gas / Smoke Level (MQ-2) */}
          <div className="p-4 rounded-2xl bg-[#0E131C] border border-white/10 flex flex-col justify-between gap-3 min-h-[175px] shadow-sm">
            {/* Top Row: Category/GPIO + Status Badge (dedicated, non-overlapping) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                  <Wind className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  MQ-2 · Pin 36 (ADC1_CH0)
                </span>
              </div>
              {renderStatusBadge(gasSensor)}
            </div>

            {/* Title: Full width, wraps naturally */}
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                Gas / Smoke Level
              </h3>
            </div>

            {/* Metric Value & Limits */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                  {gasSensor?.value !== null && gasSensor?.value !== undefined ? gasSensor.value : '—'}
                </span>
                <span className="text-xs font-mono text-slate-400">ADC</span>
              </div>

              <div className="text-right text-[10px] font-mono text-slate-400">
                <div>Warn: {config.gasWarningThreshold}</div>
                <div className="text-red-400">Crit: {config.gasCriticalThreshold}</div>
              </div>
            </div>

            {/* Uncalibrated Status Note */}
            <div className="text-[9.5px] font-mono text-amber-400/90 flex items-center justify-between border-t border-white/5 pt-2">
              <span>Uncalibrated raw analog</span>
              <span className="text-slate-400">12-bit (0–4095)</span>
            </div>
          </div>

          {/* Card 4: Optical Flame Detector (KY-026) */}
          <div className="p-4 rounded-2xl bg-[#0E131C] border border-white/10 flex flex-col justify-between gap-3 min-h-[175px] shadow-sm">
            {/* Top Row: Category/GPIO + Status Badge (dedicated, non-overlapping) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${flameSensor?.value === 1 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-rose-500/15 text-rose-400'}`}>
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  KY-026 · GPIO 15
                </span>
              </div>
              {renderStatusBadge(flameSensor, true)}
            </div>

            {/* Title: Full width, wraps naturally */}
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                Optical Flame Presence
              </h3>
            </div>

            {/* Metric Value */}
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className={`text-2xl font-black font-mono tracking-wide ${
                  flameSensor?.value === 1 ? 'text-red-400 animate-pulse' :
                  flameSensor?.value === 0 ? 'text-[#10E575]' : 'text-slate-400'
                }`}>
                  {flameSensor?.value === 1 ? 'HAZARD ACTIVE' : flameSensor?.value === 0 ? 'CLEAR' : 'NO SENSOR DATA'}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">IR Sensor</span>
            </div>

            {/* Detection Footer */}
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-white/5 pt-2">
              <span>Auto-alarm: {config.flameEventEnabled ? 'ENABLED' : 'DISABLED'}</span>
              <span className="text-slate-400">Digital IR/UV</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Active Incidents Quick Strip */}
      <div className="p-4 rounded-2xl bg-[#111722] border border-white/10 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white">Active Abnormalities</h4>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {activeIncidents.length === 0 ? 'Zero active incidents · Safety verified' : `${activeIncidents.length} unacknowledged incident(s) pending audit`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('incidents')}
          className="px-3 py-1.5 rounded-xl bg-[#1D2530] hover:bg-[#253040] text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors shrink-0"
        >
          <span>Audit Log</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#10E575]" />
        </button>
      </div>

      {/* Extra Bottom Clearance Spacer to ensure no content is obscured */}
      <div className="h-6" aria-hidden="true" />
    </div>
  );
};
