import React, { useState, useEffect } from 'react';
import { 
  SensorReading, 
  ConnectionStatus, 
  DeviceConfig, 
  IncidentRecord,
  TelemetryHistoryPoint
} from '../../types/safeplant';
import { 
  Activity, 
  Clock, 
  Thermometer, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface MonitorScreenProps {
  sensors: SensorReading[];
  connectionStatus: ConnectionStatus;
  config: DeviceConfig;
  incidents: IncidentRecord[];
  tempUnit: 'C' | 'F';
  onFetchHistory?: (range: string) => Promise<TelemetryHistoryPoint[]>;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

export const MonitorScreen: React.FC<MonitorScreenProps> = ({
  sensors,
  connectionStatus,
  config,
  incidents,
  tempUnit,
  onFetchHistory,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1h');
  const [historyData, setHistoryData] = useState<TelemetryHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real telemetry history when range changes or on mount
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      setLoading(true);
      if (onFetchHistory) {
        const pts = await onFetchHistory(selectedRange);
        if (isMounted) {
          setHistoryData(pts);
          setLoading(false);
        }
      } else {
        // Fallback: derive from existing sensor history if available
        setLoading(false);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 10000); // Poll fresh history every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedRange, onFetchHistory]);

  // Aggregate incident count by event type within selected range
  const rangeCutoffMs = {
    '1h': 3600 * 1000,
    '6h': 6 * 3600 * 1000,
    '24h': 24 * 3600 * 1000,
    '7d': 7 * 24 * 3600 * 1000
  }[selectedRange];

  const now = Date.now();
  const incidentsInRange = incidents.filter(i => {
    const t = new Date(i.timestamp).getTime();
    return now - t <= rangeCutoffMs;
  });

  const incidentCounts = {
    temp: incidentsInRange.filter(i => i.eventType === 'temperature_threshold').length,
    gas: incidentsInRange.filter(i => i.eventType === 'gas_threshold').length,
    flame: incidentsInRange.filter(i => i.eventType === 'flame_detected').length,
    intrusion: incidentsInRange.filter(i => i.eventType === 'camera_intrusion').length,
    total: incidentsInRange.length
  };

  // SVG Chart Helper
  const renderLineChart = (
    title: string,
    icon: React.ReactNode,
    metricUnit: string,
    dataKey: 'temperature' | 'humidity' | 'gas',
    warnThreshold: number | null,
    critThreshold: number | null,
    color: string,
    minY: number,
    maxY: number
  ) => {
    const validPoints = historyData
      .map(pt => ({
        val: pt[dataKey],
        time: new Date(pt.timestamp)
      }))
      .filter((pt): pt is { val: number; time: Date } => pt.val !== null && !isNaN(pt.val));

    const hasData = validPoints.length >= 2;

    const width = 400;
    const height = 120;
    const padding = { top: 15, right: 15, bottom: 25, left: 35 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Calculate scaling
    const computedMinY = hasData ? Math.min(minY, Math.min(...validPoints.map(p => p.val))) : minY;
    const computedMaxY = hasData ? Math.max(maxY, Math.max(...validPoints.map(p => p.val))) : maxY;
    const yRange = computedMaxY - computedMinY || 1;

    const getX = (idx: number) => padding.left + (idx / (validPoints.length - 1)) * graphWidth;
    const getY = (val: number) => padding.top + graphHeight - ((val - computedMinY) / yRange) * graphHeight;

    const pathData = hasData
      ? validPoints
          .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.val).toFixed(1)}`)
          .join(' ')
      : '';

    return (
      <div className="p-3 sm:p-4 rounded-2xl bg-[#0E1218] border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/5 text-slate-300">
              {icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">{title}</h3>
              <span className="text-[10px] font-mono text-slate-400">Time Range: {selectedRange.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            {warnThreshold !== null && (
              <span className="text-amber-400/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Warn: {warnThreshold}
              </span>
            )}
            {critThreshold !== null && (
              <span className="text-red-400/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Crit: {critThreshold}
              </span>
            )}
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="w-full relative h-[120px] bg-black/30 rounded-xl overflow-hidden border border-white/5">
          {hasData ? (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
              {/* Grid Lines */}
              <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#ffffff" strokeOpacity="0.05" />
              <line x1={padding.left} y1={padding.top + graphHeight / 2} x2={width - padding.right} y2={padding.top + graphHeight / 2} stroke="#ffffff" strokeOpacity="0.05" />
              <line x1={padding.left} y1={padding.top + graphHeight} x2={width - padding.right} y2={padding.top + graphHeight} stroke="#ffffff" strokeOpacity="0.05" />

              {/* Warning Threshold Line */}
              {warnThreshold !== null && warnThreshold >= computedMinY && warnThreshold <= computedMaxY && (
                <line
                  x1={padding.left}
                  y1={getY(warnThreshold)}
                  x2={width - padding.right}
                  y2={getY(warnThreshold)}
                  stroke="#F59E0B"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
              )}

              {/* Critical Threshold Line */}
              {critThreshold !== null && critThreshold >= computedMinY && critThreshold <= computedMaxY && (
                <line
                  x1={padding.left}
                  y1={getY(critThreshold)}
                  x2={width - padding.right}
                  y2={getY(critThreshold)}
                  stroke="#EF4444"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
              )}

              {/* Telemetry Line */}
              <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Point Dots */}
              {validPoints.map((pt, i) => (
                <circle key={i} cx={getX(i)} cy={getY(pt.val)} r="2" fill={color} />
              ))}

              {/* Axis Labels */}
              <text x={padding.left - 4} y={padding.top + 8} fill="#94A3B8" fontSize="8" textAnchor="end" fontFamily="monospace">
                {computedMaxY.toFixed(0)}
              </text>
              <text x={padding.left - 4} y={padding.top + graphHeight} fill="#94A3B8" fontSize="8" textAnchor="end" fontFamily="monospace">
                {computedMinY.toFixed(0)}
              </text>

              {/* Time stamps */}
              <text x={padding.left} y={height - 5} fill="#64748B" fontSize="8" textAnchor="start" fontFamily="monospace">
                {validPoints[0].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
              <text x={width - padding.right} y={height - 5} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
                {validPoints[validPoints.length - 1].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            </svg>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 text-slate-400 font-mono text-[11px] gap-1">
              <Info className="w-4 h-4 text-slate-400" />
              <span>No telemetry history for {selectedRange.toUpperCase()}</span>
              <span className="text-[9.5px] text-slate-400">Awaiting ESP32 hardware telemetry stream</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
          <span>Points recorded: {validPoints.length}</span>
          <span>Latest: {validPoints.length > 0 ? `${validPoints[validPoints.length - 1].val} ${metricUnit}` : 'N/A'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 text-slate-100 max-w-2xl mx-auto">
      {/* 1. Header with Time-Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10E575]" />
            <span>Readings & Historical Analytics</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            Persistent Telemetry Trends & Incident Frequency
          </p>
        </div>

        {/* Time Ranges: 1h, 6h, 24h, 7d (Section 4 Requirement) */}
        <div className="flex items-center bg-[#12161D] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['1h', '6h', '24h', '7d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                selectedRange === range
                  ? 'bg-[#1F2733] text-[#10E575] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Incident Count Summary Breakdown (Chart 4) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
              Incident Frequency Breakdown ({selectedRange.toUpperCase()})
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
            {incidentCounts.total} Total Event(s)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">TEMPERATURE</span>
            <span className="text-lg font-bold text-orange-400">{incidentCounts.temp}</span>
            <span className="text-[9px] text-slate-400">Over-threshold</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">GAS / SMOKE</span>
            <span className="text-lg font-bold text-amber-400">{incidentCounts.gas}</span>
            <span className="text-[9px] text-slate-400">ADC ceiling</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">FLAME DETECTIONS</span>
            <span className="text-lg font-bold text-red-400">{incidentCounts.flame}</span>
            <span className="text-[9px] text-slate-400">Optical IR/UV</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">ZONE INTRUSIONS</span>
            <span className="text-lg font-bold text-cyan-400">{incidentCounts.intrusion}</span>
            <span className="text-[9px] text-slate-400">CameraX polygon</span>
          </div>
        </div>
      </div>

      {/* 3. Required Historical Charts (Section 4) */}
      <div className="flex flex-col gap-3">
        {/* Chart 1: Temperature over time */}
        {renderLineChart(
          'Ambient Temperature Trend (DHT11)',
          <Thermometer className="w-4 h-4 text-orange-400" />,
          '°C',
          'temperature',
          config.tempWarningThreshold,
          config.tempCriticalThreshold,
          '#FB923C',
          15,
          65
        )}

        {/* Chart 2: Humidity over time */}
        {renderLineChart(
          'Relative Humidity Trend (DHT11)',
          <Droplets className="w-4 h-4 text-cyan-400" />,
          '%RH',
          'humidity',
          config.humidityWarningThreshold,
          config.humidityCriticalThreshold,
          '#22D3EE',
          20,
          95
        )}

        {/* Chart 3: Gas/smoke sensor value over time (MQ-2) */}
        {renderLineChart(
          'Combustible Gas / Smoke Trend (MQ-2 Raw ADC)',
          <Wind className="w-4 h-4 text-amber-400" />,
          'ADC',
          'gas',
          config.gasWarningThreshold,
          config.gasCriticalThreshold,
          '#FBBF24',
          200,
          3500
        )}
      </div>
    </div>
  );
};
