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
  const displayVal = unit === 'F' ? (reading.value * 9) / 5 + 32 : reading.value;
  const unitSymbol = unit === 'F' ? '°F' : '°C';
  
  // Calculate radial angle between -120 deg and +120 deg (240 deg sweep)
  const minVal = unit === 'F' ? 14 : -10;
  const maxVal = unit === 'F' ? 176 : 80;
  const clamped = Math.max(minVal, Math.min(maxVal, displayVal));
  const ratio = (clamped - minVal) / (maxVal - minVal);
  const angle = -120 + ratio * 240;

  // Arc path constants
  const size = 160;
  const radius = 64;
  const stroke = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ratio * (circumference * (240 / 360));
  
  const isWarning = reading.status === 'warning';
  const isCritical = reading.status === 'critical';
  const color = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#10E575';

  return (
    <div className="relative p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden group">
      {/* Background radial glow */}
      <div 
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between mb-1 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300">
            <Thermometer className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-xs font-medium text-slate-300">Temperature</span>
        </div>
        <button 
          onClick={onToggleUnit}
          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#18202A] border border-white/5 text-slate-400 hover:text-white transition-colors"
          title="Toggle Celsius / Fahrenheit"
        >
          {unitSymbol}
        </button>
      </div>

      {/* Radial Arc Graphic */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg width={size} height={size * 0.72} viewBox="0 0 160 120" className="overflow-visible">
          <defs>
            <linearGradient id="tempArcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10E575" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 25 105 A 64 64 0 1 1 135 105"
            fill="none"
            stroke="#1C2430"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
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

          {/* Center Indicator Needle */}
          <g transform={`translate(80, 80) rotate(${angle})`} style={{ transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <line x1="0" y1="0" x2="0" y2="-54" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="-54" r="3" fill={color} />
          </g>
          <circle cx="80" cy="80" r="5" fill="#FFFFFF" />
          <circle cx="80" cy="80" r="2.5" fill="#0C1015" />
        </svg>

        {/* Value Text Display */}
        <div className="text-center -mt-6">
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              {displayVal.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">{unitSymbol}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Limit: {unit === 'F' ? ((reading.warningThreshold * 9) / 5 + 32).toFixed(0) : reading.warningThreshold} {unitSymbol}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono text-[10px] text-slate-400">{reading.hardwarePin}</span>
        <span className="font-medium capitalize text-slate-200" style={{ color: color }}>
          {reading.status}
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
  const isWarning = reading.status === 'warning';
  const color = isWarning ? '#F59E0B' : '#38BDF8';

  // SVG Sparkline path from history
  const history = reading.history && reading.history.length > 0 ? reading.history : [48, 49, 48.5, 48.2];
  const min = Math.min(...history) - 2;
  const max = Math.max(...history) + 2;
  const range = max - min || 1;

  const width = 140;
  const height = 44;
  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M 0,${height} L ${points} L ${width},${height} Z`;

  return (
    <div className="relative p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300">
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xs font-medium text-slate-300">Humidity</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">24h Span</span>
      </div>

      <div className="my-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {reading.value.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">%RH</span>
        </div>
        <p className="text-[10px] text-slate-400">Target Envelope: 35–65%</p>
      </div>

      {/* Sparkline Canvas */}
      <div className="w-full h-11 relative my-1">
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
          {/* Latest point pulse */}
          <circle 
            cx={width} 
            cy={height - ((reading.value - min) / range) * (height - 8) - 4} 
            r="3.5" 
            fill="#38BDF8" 
          />
        </svg>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono text-[10px] text-slate-400">Dew Point: 13.2°C</span>
        <span className="font-medium text-sky-400">Stable</span>
      </div>
    </div>
  );
};

// 3. Gas & Smoke Multi-Segment LED Meter Card
interface GasMeterProps {
  reading: SensorReading;
}

export const GasSmokeLevelMeter: React.FC<GasMeterProps> = ({ reading }) => {
  const isWarning = reading.value >= reading.warningThreshold;
  const isCritical = reading.value >= reading.criticalThreshold;
  const totalSegments = 10;
  
  // Calculate active segments
  const pct = Math.min(100, Math.max(0, (reading.value / reading.criticalThreshold) * 100));
  const activeSegments = Math.round((pct / 100) * totalSegments);
  
  const statusColor = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#10E575';

  return (
    <div className="relative p-4 rounded-2xl bg-[#12161D] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#18202A] flex items-center justify-center text-slate-300">
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-300">Gas & Smoke</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">MQ-2/MQ-135</span>
      </div>

      <div className="my-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {reading.value}
          </span>
          <span className="text-xs font-mono text-slate-400">PPM</span>
        </div>
        <p className="text-[10px] text-slate-400">Combustible Hydrocarbons</p>
      </div>

      {/* Discrete Segmented Industrial Bar Meter */}
      <div className="flex items-center gap-1.5 w-full my-2">
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isActive = idx < activeSegments;
          let segmentColor = '#10E575';
          if (idx >= 6) segmentColor = '#F59E0B';
          if (idx >= 8) segmentColor = '#EF4444';

          return (
            <div
              key={idx}
              className="flex-1 h-3.5 rounded-xs transition-all duration-300"
              style={{
                backgroundColor: isActive ? segmentColor : '#1C2430',
                boxShadow: isActive ? `0 0 6px ${segmentColor}66` : 'none',
              }}
            />
          );
        })}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono text-[10px] text-slate-400">Safe: &lt;250 PPM</span>
        <span className="font-medium" style={{ color: statusColor }}>
          {isCritical ? 'ALERT' : isWarning ? 'ELEVATED' : 'CLEAR'}
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
  const isFlameDetected = reading.value > 0;

  return (
    <div className={`relative p-4 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      isFlameDetected 
        ? 'bg-[#2A0E12] border border-[#EF4444]/60 shadow-[0_0_24px_rgba(239,68,68,0.25)]' 
        : 'bg-[#12161D] border border-white/5 hover:border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isFlameDetected ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#18202A] text-slate-300'
          }`}>
            <Flame className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300">Flame Optical IR/UV</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">KY-026</span>
      </div>

      {/* Optical Sensor Target Graphic */}
      <div className="flex items-center gap-3 my-2">
        <div className="relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0">
          {/* Radar scan ring */}
          <div className={`absolute inset-0 rounded-full border transition-all ${
            isFlameDetected 
              ? 'border-[#EF4444] animate-ping opacity-75' 
              : 'border-[#10E575]/30'
          }`} />
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isFlameDetected ? 'bg-[#EF4444] shadow-[0_0_12px_#EF4444]' : 'bg-[#10E575]/20'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isFlameDetected ? 'bg-white' : 'bg-[#10E575]'
            }`} />
          </div>
        </div>

        <div className="flex flex-col">
          <span className={`text-base font-bold font-mono tracking-tight ${
            isFlameDetected ? 'text-[#EF4444]' : 'text-white'
          }`}>
            {isFlameDetected ? 'FIRE DETECTED' : 'NO FLICKER'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {isFlameDetected ? 'Optic trigger confirmed' : 'Dual-band IR 4.3µm scan'}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono text-[10px] text-slate-400">Optical Response: &lt;20ms</span>
        <span className={`font-medium ${isFlameDetected ? 'text-[#EF4444]' : 'text-[#10E575]'}`}>
          {isFlameDetected ? 'CRITICAL HAZARD' : 'SECURE'}
        </span>
      </div>
    </div>
  );
};
