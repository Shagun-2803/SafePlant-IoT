import React from 'react';
import { SensorReading } from '../types/safeplant';
import { ShieldCheck, Flame, Droplets, Thermometer, Wind, AlertTriangle } from 'lucide-react';

// 1. Temperature Radial Arc Gauge
interface TempGaugeProps {
  reading: SensorReading;
  unit: 'C' | 'F';
  onToggleUnit?: () => void;
}

export const TemperatureArcGauge: React.FC<TempGaugeProps> = ({ reading, unit, onToggleUnit }) => {
  const isUnknown = reading.value === null || reading.value === undefined;
  const numericVal: number = reading.value ?? 0;
  const displayVal = isUnknown ? null : (unit === 'F' ? (numericVal * 9) / 5 + 32 : numericVal);
  const unitSymbol = unit === 'F' ? '°F' : '°C';
  
  // Calculate radial angle between -120 deg and +120 deg (240 deg sweep)
  const minVal = unit === 'F' ? 14 : -10;
  const maxVal = unit === 'F' ? 176 : 80;
  const clamped = isUnknown ? minVal : Math.max(minVal, Math.min(maxVal, displayVal!));
  const ratio = isUnknown ? 0 : (clamped - minVal) / (maxVal - minVal);
  const angle = -120 + ratio * 240;

  // Arc path constants
  const size = 160;
  const radius = 64;
  const stroke = 9;
  const circumference = 2 * Math.PI * radius;
  
  const isWarning = reading.status === 'warning';
  const isCritical = reading.status === 'critical';
  const color = isUnknown ? '#64748B' : isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#10E575';

  return (
    <div className="relative p-3 min-[400px]:p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden group">
      {/* Background radial glow */}
      {!isUnknown && (
        <div 
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="flex items-center justify-between mb-1 z-10 gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300 shrink-0">
            <Thermometer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
          </div>
          <span className="text-xs font-medium text-slate-300 truncate">Temperature</span>
        </div>
        <button 
          onClick={onToggleUnit}
          className="text-[9.5px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-md bg-[#18202A] border border-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
          title="Toggle Celsius / Fahrenheit"
        >
          {unitSymbol}
        </button>
      </div>

      {/* Radial Arc Graphic */}
      <div className="relative flex flex-col items-center justify-center my-0.5 sm:my-1 w-full">
        <svg viewBox="0 0 160 115" className="w-full max-w-[145px] h-auto overflow-visible mx-auto">
          {/* Background Track Arc */}
          <path
            d="M 25 105 A 64 64 0 1 1 135 105"
            fill="none"
            stroke="#1C2430"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          {!isUnknown && (
            <path
              d="M 25 105 A 64 64 0 1 1 135 105"
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(240 / 360) * circumference} ${circumference}`}
              style={{
                strokeDashoffset: (circumference * (240 / 360)) * (1 - ratio),
                transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease'
              }}
            />
          )}

          {/* Center Indicator Needle */}
          <g transform={`translate(80, 80) rotate(${angle})`} style={{ transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <line x1="0" y1="0" x2="0" y2="-54" stroke={isUnknown ? '#64748B' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="-54" r="3" fill={color} />
          </g>
          <circle cx="80" cy="80" r="5" fill="#FFFFFF" />
          <circle cx="80" cy="80" r="2.5" fill="#0C1015" />
        </svg>

        {/* Value Text Display */}
        <div className="text-center -mt-6">
          <div className="flex items-baseline justify-center gap-0.5">
            {isUnknown ? (
              <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-400">
                UNKNOWN
              </span>
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                  {displayVal!.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">{unitSymbol}</span>
              </>
            )}
          </div>
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-mono truncate block max-w-full">
            {isUnknown ? 'Awaiting telemetry' : `Limit: ${unit === 'F' ? ((reading.warningThreshold * 9) / 5 + 32).toFixed(0) : reading.warningThreshold} ${unitSymbol}`}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 truncate">{reading.hardwarePin}</span>
        <span className="font-medium capitalize text-slate-200 shrink-0" style={{ color: color }}>
          {isUnknown ? 'UNKNOWN' : reading.status}
        </span>
      </div>
    </div>
  );
};

// 2. Humidity Sparkline Trend Chart Card
interface HumiditySparkProps {
  reading: SensorReading;
}

export const HumiditySparkChart: React.FC<HumiditySparkProps> = ({ reading }) => {
  const isUnknown = reading.value === null || reading.value === undefined;
  const isWarning = reading.status === 'warning';
  const color = isUnknown ? '#64748B' : isWarning ? '#F59E0B' : '#38BDF8';

  // SVG Sparkline path from history, filtering out nulls
  const validHistory = (reading.history || []).filter((v): v is number => v !== null && v !== undefined);
  const hasHistory = !isUnknown && validHistory.length >= 2;
  const min = hasHistory ? Math.min(...validHistory) - 2 : 0;
  const max = hasHistory ? Math.max(...validHistory) + 2 : 100;
  const range = max - min || 1;

  const width = 140;
  const height = 44;
  const points = hasHistory ? validHistory.map((val, idx) => {
    const x = (idx / (validHistory.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ') : '';

  const areaPath = hasHistory ? `M 0,${height} L ${points} L ${width},${height} Z` : '';

  return (
    <div className="relative p-3 min-[400px]:p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-1 gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300 shrink-0">
            <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
          </div>
          <span className="text-xs font-medium text-slate-300 truncate">Humidity</span>
        </div>
        <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 shrink-0">24h Span</span>
      </div>

      <div className="my-1.5">
        <div className="flex items-baseline gap-1">
          {isUnknown ? (
            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-400">
              UNKNOWN
            </span>
          ) : (
            <>
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                {reading.value!.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-400">%RH</span>
            </>
          )}
        </div>
        <p className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
          {isUnknown ? 'Awaiting telemetry packet' : 'Envelope: 35–65%'}
        </p>
      </div>

      {/* Sparkline Canvas */}
      <div className="w-full h-10 sm:h-11 relative my-1">
        {hasHistory ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#humGrad)" />
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            <circle 
              cx={width} 
              cy={height - ((reading.value! - min) / range) * (height - 8) - 4} 
              r="3.5" 
              fill="#38BDF8" 
            />
          </svg>
        ) : (
          <div className="w-full h-full border border-dashed border-white/10 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-mono text-slate-500">
            NO TELEMETRY VECTOR
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 truncate">
          {isUnknown ? 'Awaiting Data' : 'Humidity Sensor Online'}
        </span>
        <span className="font-medium text-sky-400 shrink-0">
          {isUnknown ? 'UNKNOWN' : 'Stable'}
        </span>
      </div>
    </div>
  );
};

// 3. Gas & Smoke Multi-Segment LED Meter Card
interface GasMeterProps {
  reading: SensorReading;
}

export const GasSmokeLevelMeter: React.FC<GasMeterProps> = ({ reading }) => {
  const isUnknown = reading.value === null || reading.value === undefined;
  const isWarning = !isUnknown && reading.value! >= reading.warningThreshold;
  const isCritical = !isUnknown && reading.value! >= reading.criticalThreshold;
  const totalSegments = 10;
  
  // Calculate active segments
  const pct = isUnknown ? 0 : Math.min(100, Math.max(0, (reading.value! / reading.criticalThreshold) * 100));
  const activeSegments = Math.round((pct / 100) * totalSegments);
  
  const statusColor = isUnknown ? '#64748B' : isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#10E575';

  return (
    <div className="relative p-3 min-[400px]:p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-1 gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300 shrink-0">
            <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-300 truncate">Gas & Smoke</span>
        </div>
        <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 shrink-0">MQ-2/135</span>
      </div>

      <div className="my-1.5">
        <div className="flex items-baseline gap-1">
          {isUnknown ? (
            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-400">
              UNKNOWN
            </span>
          ) : (
            <>
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                {reading.value}
              </span>
              <span className="text-xs font-mono text-slate-400">PPM</span>
            </>
          )}
        </div>
        <p className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
          {isUnknown ? 'Awaiting MQ calibration' : 'Hydrocarbon Vapor'}
        </p>
      </div>

      {/* Discrete Segmented Industrial Bar Meter */}
      <div className="flex items-center gap-1 sm:gap-1.5 w-full my-2">
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isActive = !isUnknown && idx < activeSegments;
          let segmentColor = '#10E575';
          if (idx >= 6) segmentColor = '#F59E0B';
          if (idx >= 8) segmentColor = '#EF4444';

          return (
            <div
              key={idx}
              className="flex-1 h-3 sm:h-3.5 rounded-xs transition-all duration-300"
              style={{
                backgroundColor: isActive ? segmentColor : '#1C2430',
                boxShadow: isActive ? `0 0 6px ${segmentColor}66` : 'none',
              }}
            />
          );
        })}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 truncate">&lt;250 PPM Safe</span>
        <span className="font-medium shrink-0" style={{ color: statusColor }}>
          {isUnknown ? 'UNKNOWN' : isCritical ? 'ALERT' : isWarning ? 'ELEVATED' : 'CLEAR'}
        </span>
      </div>
    </div>
  );
};

// 4. Flame Optical Dual-Spectrum Detector Card
interface FlameDetectorProps {
  reading: SensorReading;
}

export const FlameOpticalDetector: React.FC<FlameDetectorProps> = ({ reading }) => {
  const isUnknown = reading.value === null || reading.value === undefined;
  const isFlameDetected = !isUnknown && reading.value! > 0;

  return (
    <div className={`relative p-3 min-[400px]:p-4 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      isFlameDetected 
        ? 'bg-[#2A0E12] border border-[#EF4444]/60 shadow-[0_0_24px_rgba(239,68,68,0.25)]' 
        : 'bg-[#12161D] border border-white/5 hover:border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-1 gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isFlameDetected ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#18202A] text-slate-300'
          }`}>
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300 truncate">Flame Optical</span>
        </div>
        <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 shrink-0">KY-026</span>
      </div>

      {/* Optical Sensor Target Graphic */}
      <div className="flex items-center gap-2.5 sm:gap-3 my-1.5">
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0">
          {/* Radar scan ring */}
          <div className={`absolute inset-0 rounded-full border transition-all ${
            isFlameDetected 
              ? 'border-[#EF4444] animate-ping opacity-75' 
              : isUnknown
              ? 'border-slate-600/40'
              : 'border-[#10E575]/30'
          }`} />
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
            isFlameDetected ? 'bg-[#EF4444] shadow-[0_0_12px_#EF4444]' : isUnknown ? 'bg-slate-700/30' : 'bg-[#10E575]/20'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isFlameDetected ? 'bg-white' : isUnknown ? 'bg-slate-500' : 'bg-[#10E575]'
            }`} />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <span className={`text-sm sm:text-base font-bold font-mono tracking-tight truncate ${
            isFlameDetected ? 'text-[#EF4444]' : isUnknown ? 'text-slate-400' : 'text-white'
          }`}>
            {isUnknown ? 'UNKNOWN' : isFlameDetected ? 'FIRE DETECTED' : 'NO FLICKER'}
          </span>
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-mono truncate">
            {isUnknown ? 'No IR/UV packet' : isFlameDetected ? 'Optic triggered' : 'IR 4.3µm scan'}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 truncate">
          {reading.deviceTimestamp ? `TS: ${reading.deviceTimestamp.substring(11, 19)}` : isUnknown ? 'Awaiting Packet' : 'Live Optic'}
        </span>
        <span className={`font-medium shrink-0 ${
          isUnknown ? 'text-slate-400' : isFlameDetected ? 'text-[#EF4444]' : 'text-[#10E575]'
        }`}>
          {isUnknown ? 'UNKNOWN' : isFlameDetected ? 'CRITICAL' : 'SECURE'}
        </span>
      </div>
    </div>
  );
};
