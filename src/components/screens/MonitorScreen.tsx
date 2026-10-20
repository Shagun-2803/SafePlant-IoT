import React, { useState } from 'react';
import { SensorReading, ConnectionStatus } from '../../types/safeplant';
import { 
  Activity, 
  Cpu, 
  Radio, 
  Wifi, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sliders,
  Filter
} from 'lucide-react';

interface MonitorScreenProps {
  sensors: SensorReading[];
  connectionStatus: ConnectionStatus;
  tempUnit: 'C' | 'F';
  onSimulateStateChange?: (status: ConnectionStatus) => void;
}

export const MonitorScreen: React.FC<MonitorScreenProps> = ({
  sensors,
  connectionStatus,
  tempUnit,
  onSimulateStateChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'thermal' | 'air' | 'mechanical'>('all');
  const [selectedSensorId, setSelectedSensorId] = useState<string>(sensors[0]?.id || 'temp_core');

  const filteredSensors = sensors.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'thermal') return s.category === 'temperature' || s.category === 'flame';
    if (selectedCategory === 'air') return s.category === 'gas' || s.category === 'humidity';
    if (selectedCategory === 'mechanical') return s.category === 'pressure' || s.category === 'vibration';
    return true;
  });

  const activeSensor = sensors.find((s) => s.id === selectedSensorId) || sensors[0];

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-4 pb-6 select-none max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap min-[340px]:flex-nowrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Telemetry Monitor</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">ESP32 GPIO & I2C Bus Diagnostics</p>
        </div>

        {/* State Filter Pills / Buttons */}
        <div className="flex items-center gap-1 bg-[#12161D] p-1 rounded-xl border border-white/5 text-[10px] sm:text-[11px] font-mono shrink-0">
          <span className={`w-2 h-2 rounded-full ${sensors.some(s => s.value !== null) ? 'bg-[#10E575]' : 'bg-slate-500'}`} />
          <span className="text-slate-300 pr-1">{sensors.filter(s => s.value !== null).length}/{sensors.length} Active</span>
        </div>
      </div>

      {/* Category Segmented Control */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-[#12161E] rounded-xl border border-white/5 overflow-x-auto">
        {(['all', 'thermal', 'air', 'mechanical'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-1 py-1 sm:py-1.5 px-2 text-[11px] sm:text-xs font-medium rounded-lg capitalize transition-colors truncate ${
              selectedCategory === cat
                ? 'bg-[#1D2633] text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All Channels' : cat}
          </button>
        ))}
      </div>

      {/* Connection State Diagnostic Bar */}
      {connectionStatus !== 'CONNECTED' && (
        <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
          connectionStatus === 'STALE_DATA'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : connectionStatus === 'DISCONNECTED'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold uppercase tracking-wider block font-mono text-[10px]">
              {connectionStatus}
            </span>
            <span className="text-[11px] text-slate-300 line-clamp-2">
              {connectionStatus === 'STALE_DATA' && 'FastAPI stream heartbeat timeout > 5000ms. Ingress paused.'}
              {connectionStatus === 'DISCONNECTED' && 'Hardware node or FastAPI backend offline. Check server status and network.'}
              {connectionStatus === 'CONNECTING' && 'Connecting to FastAPI WebSocket (/ws)...'}
              {connectionStatus === 'RECONNECTING' && 'Attempting automatic WebSocket reconnection...'}
            </span>
          </div>
        </div>
      )}

      {/* Active Sensor Deep Dive Hero Card */}
      {activeSensor && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121720] border border-white/10 shadow-xl flex flex-col gap-3">
          <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                  {activeSensor.hardwarePin}
                </span>
                <span className={`text-[10px] font-mono font-bold uppercase ${
                  activeSensor.status === 'critical' ? 'text-red-400' : activeSensor.status === 'warning' ? 'text-amber-400' : activeSensor.status === 'unknown' ? 'text-slate-400' : 'text-[#10E575]'
                }`}>
                  {activeSensor.status}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-1 truncate">{activeSensor.name}</h2>
            </div>

            <div className="text-left min-[380px]:text-right shrink-0">
              <div className="flex items-baseline min-[380px]:justify-end gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                  {activeSensor.value === null
                    ? 'UNKNOWN'
                    : activeSensor.category === 'temperature' && tempUnit === 'F'
                    ? ((activeSensor.value * 9) / 5 + 32).toFixed(1)
                    : activeSensor.category === 'flame'
                    ? (activeSensor.value === 0 ? 'SAFE' : 'FLAME')
                    : activeSensor.value}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {activeSensor.value !== null && (activeSensor.category === 'temperature' ? (tempUnit === 'F' ? '°F' : '°C') : activeSensor.unit)}
                </span>
              </div>
              <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-500 block">
                {activeSensor.deviceTimestamp 
                  ? `Device: ${activeSensor.deviceTimestamp.substring(11, 19)} · RSSI: ${activeSensor.signalDbm} dBm`
                  : activeSensor.value === null ? 'No packet received · Offline' : `RSSI: ${activeSensor.signalDbm} dBm · ${activeSensor.lastUpdated}`}
              </span>
              <span className={`text-[9px] font-mono uppercase ${activeSensor.value !== null && activeSensor.source === 'esp32' ? 'text-[#10E575]' : 'text-slate-400'}`}>
                Source: {activeSensor.value === null ? 'Awaiting Telemetry' : activeSensor.source === 'esp32' ? 'ESP32 Wi-Fi Telemetry' : 'External Ingress'}
              </span>
            </div>
          </div>

          {/* Operating Range Envelope Bar */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 gap-1 flex-wrap">
              <span>Min: {activeSensor.minRange}</span>
              <span className="text-amber-400">Warn: {activeSensor.warningThreshold}</span>
              <span className="text-red-400">Crit: {activeSensor.criticalThreshold}</span>
              <span>Max: {activeSensor.maxRange}</span>
            </div>

            {/* Threshold Visual Bar */}
            <div className="w-full h-2.5 bg-[#1A212D] rounded-full overflow-hidden relative border border-white/5">
              {/* Normal Zone */}
              <div className="absolute inset-y-0 left-0 bg-[#10E575]/30" style={{ width: `${(activeSensor.warningThreshold / activeSensor.maxRange) * 100}%` }} />
              {/* Warning Zone */}
              <div 
                className="absolute inset-y-0 bg-amber-500/30" 
                style={{ 
                  left: `${(activeSensor.warningThreshold / activeSensor.maxRange) * 100}%`,
                  width: `${((activeSensor.criticalThreshold - activeSensor.warningThreshold) / activeSensor.maxRange) * 100}%` 
                }} 
              />
              {/* Critical Zone */}
              <div 
                className="absolute inset-y-0 right-0 bg-red-500/30" 
                style={{ width: `${100 - (activeSensor.criticalThreshold / activeSensor.maxRange) * 100}%` }} 
              />

              {/* Current Value Marker */}
              {activeSensor.value !== null && (
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#FFF] transition-all duration-500"
                  style={{
                    left: `${Math.min(98, Math.max(2, (activeSensor.value / (activeSensor.maxRange || 1)) * 100))}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* History Trendline SVG */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mb-1">
              <span className="font-mono text-[9.5px] sm:text-[10px]">Recent Samples Window</span>
              <span className="text-[#10E575] font-mono text-[9.5px] sm:text-[10px]">FastAPI Stream</span>
            </div>

            <div className="w-full h-14 sm:h-16 relative bg-[#0D1117] rounded-lg p-2 border border-white/5">
              {(() => {
                const validHistory = (activeSensor.history || []).filter((v): v is number => v !== null && v !== undefined);
                if (validHistory.length < 2) {
                  return (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-500">
                      AWAITING MORE TELEMETRY PACKETS
                    </div>
                  );
                }
                const minH = Math.min(...validHistory);
                const maxH = Math.max(...validHistory);
                const rangeH = maxH - minH || 1;
                const points = validHistory.map((val, i) => {
                  const x = (i / (validHistory.length - 1)) * 280;
                  const y = 44 - ((val - minH) / rangeH) * 36;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <svg viewBox="0 0 280 48" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10E575" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10E575" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="12" x2="280" y2="12" stroke="#222C38" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="36" x2="280" y2="36" stroke="#222C38" strokeWidth="1" strokeDasharray="3 3" />
                    <path d={`M 0,48 L ${points} L 280,48 Z`} fill="url(#detailGrad)" />
                    <polyline fill="none" stroke="#10E575" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sensor List Grid: 1 col on mobile, 2 cols on wider screens */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
          Hardware Channels ({filteredSensors.length})
        </h3>

        <div className="grid grid-cols-1 min-[640px]:grid-cols-2 gap-2">
          {filteredSensors.map((sensor) => {
            const isSelected = sensor.id === selectedSensorId;
            const isCrit = sensor.status === 'critical';
            const isWarn = sensor.status === 'warning';
            const isUnknown = sensor.value === null;

            return (
              <button
                key={sensor.id}
                onClick={() => setSelectedSensorId(sensor.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 min-w-0 ${
                  isSelected
                    ? 'bg-[#18202C] border-[#10E575]/50 shadow-md'
                    : 'bg-[#11161F] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                    isUnknown ? 'bg-slate-800 text-slate-400' : isCrit ? 'bg-red-500/20 text-red-400' : isWarn ? 'bg-amber-500/20 text-amber-400' : 'bg-[#10E575]/20 text-[#10E575]'
                  }`}>
                    {sensor.category.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white block truncate max-w-[130px] min-[360px]:max-w-[170px] sm:max-w-none">
                      {sensor.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      {sensor.hardwarePin} {sensor.source === 'esp32' && '· ESP32'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums">
                      {isUnknown
                        ? 'UNKNOWN'
                        : sensor.category === 'temperature' && tempUnit === 'F'
                        ? ((sensor.value! * 9) / 5 + 32).toFixed(1)
                        : sensor.category === 'flame'
                        ? (sensor.value === 0 ? '0 (Clear)' : '1 (Alert)')
                        : sensor.value}
                    </span>
                    <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400">
                      {!isUnknown && (sensor.category === 'temperature' ? (tempUnit === 'F' ? '°F' : '°C') : sensor.unit)}
                    </span>
                  </div>
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-500 block">
                    {sensor.deviceTimestamp ? sensor.deviceTimestamp.substring(11, 19) : sensor.lastUpdated}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
