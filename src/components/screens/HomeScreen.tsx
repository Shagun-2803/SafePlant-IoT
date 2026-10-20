import React from 'react';
import { 
  SensorReading, 
  SystemSafetyState, 
  IncidentRecord, 
  ConnectionStatus 
} from '../../types/safeplant';
import { SafePlantLogo } from '../SafePlantLogo';
import { 
  TemperatureArcGauge, 
  HumiditySparkChart, 
  GasSmokeLevelMeter, 
  FlameOpticalDetector 
} from '../CustomGauges';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Cpu, 
  ChevronRight, 
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

// Import generated hero image
import heroPlantImg from '../../assets/images/hero_industrial_plant_1792527751243.jpg';

interface HomeScreenProps {
  sensors: SensorReading[];
  systemState: SystemSafetyState;
  incidents: IncidentRecord[];
  connectionStatus: ConnectionStatus;
  tempUnit: 'C' | 'F';
  onToggleTempUnit: () => void;
  onNavigateTab: (tab: 'overview' | 'monitor' | 'vision' | 'incidents' | 'settings') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  sensors,
  systemState,
  incidents,
  connectionStatus,
  tempUnit,
  onToggleTempUnit,
  onNavigateTab,
}) => {
  const tempReading = sensors.find((s) => s.category === 'temperature') || sensors[0];
  const humReading = sensors.find((s) => s.category === 'humidity') || sensors[1];
  const gasReading = sensors.find((s) => s.category === 'gas') || sensors[2];
  const flameReading = sensors.find((s) => s.category === 'flame') || sensors[3];

  const recentIncidents = incidents.slice(0, 3);

  // Status focal styling
  const stateConfig = {
    NOMINAL: {
      label: 'ALL SYSTEMS NOMINAL',
      sub: '4/4 telemetry channels verified within safety envelope',
      bg: 'bg-[#10E575]/10',
      border: 'border-[#10E575]/40',
      text: 'text-[#10E575]',
      glow: 'shadow-[0_0_24px_rgba(16,229,117,0.15)]',
      icon: ShieldCheck,
      badge: 'SECURE'
    },
    WARNING: {
      label: 'SYSTEM WARNING DETECTED',
      sub: 'Combustible gas threshold exceeded baseline in Zone B-2',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_24px_rgba(245,158,11,0.2)]',
      icon: AlertTriangle,
      badge: 'ATTENTION'
    },
    CRITICAL: {
      label: 'CRITICAL HAZARD DETECTED',
      sub: 'Active flame confirmation or extreme thermal spike',
      bg: 'bg-red-500/15',
      border: 'border-red-500/60',
      text: 'text-red-400',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
      icon: ShieldAlert,
      badge: 'HAZARD CONFIRMED'
    }
  }[systemState];

  const StateIcon = stateConfig.icon;

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-4 pb-6 select-none max-w-full">
      {/* 1. Header with SafePlant Identity and Compact Connection Indicator */}
      <header className="flex items-center justify-between pt-1 gap-2 flex-wrap min-[340px]:flex-nowrap">
        <SafePlantLogo size={34} />

        {/* Compact Connection / Node Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#131922] border border-white/5 rounded-full px-2 sm:px-2.5 py-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-[#10E575] shadow-[0_0_6px_#10E575]'
                  : connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING'
                  ? 'bg-amber-400 animate-pulse'
                  : connectionStatus === 'STALE_DATA'
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-300">
              {connectionStatus === 'CONNECTED' 
                ? 'FastAPI Live' 
                : connectionStatus === 'RECONNECTING'
                ? 'Reconnecting...'
                : connectionStatus === 'STALE_DATA'
                ? 'Stale Heartbeat'
                : connectionStatus}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400">
            {tempReading.deviceTimestamp ? tempReading.deviceTimestamp.substring(11, 19) : '14ms'}
          </span>
        </div>
      </header>

      {/* 2. Hero Section: Factory Photography with Restrained Digital Twin Overlays */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
        <div className="relative h-44 sm:h-52 md:h-56 w-full overflow-hidden bg-[#0A0D11]">
          <img
            src={heroPlantImg}
            alt="SafePlant Industrial Facility Telemetry"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-90 group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          {/* Measured Dark Scrim for Perfect Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E12] via-[#0B0E12]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E12]/80 via-transparent to-[#0B0E12]/40" />

          {/* Subtle Industrial Grid Line Grid */}
          <div className="absolute inset-0 bg-industrial-grid opacity-30 pointer-events-none" />

          {/* Top Digital Twin Telemetry Badges */}
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between text-[9px] sm:text-[10px] font-mono gap-1">
            <div className="flex items-center gap-1.5 bg-[#0B0E12]/80 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 truncate">
              <span className="text-slate-400">ZONE:</span>
              <span className="font-semibold text-white truncate">REFINERY A-4</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0B0E12]/80 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 shrink-0">
              <span className="text-[#10E575]">TWIN:</span>
              <span className="font-semibold text-white">SYNCED</span>
            </div>
          </div>

          {/* Bottom Hero Overlay */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex flex-wrap sm:flex-nowrap items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#10E575] block">
                Facility Health Index
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                  {systemState === 'CRITICAL' ? '71.2' : systemState === 'WARNING' ? '88.5' : '99.4'}%
                </span>
                <span className="text-[10px] sm:text-xs text-slate-300 font-mono hidden min-[360px]:inline">Telemetry OK</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('vision')}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-white text-[11px] sm:text-xs font-medium transition-colors shrink-0"
            >
              <span>AI Vision</span>
              <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Safety Focal Point — Hero State Banner */}
      <section
        className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-2.5 sm:gap-3 ${stateConfig.bg} ${stateConfig.border} ${stateConfig.glow}`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${stateConfig.bg} border ${stateConfig.border}`}>
            <StateIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${stateConfig.text}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] sm:text-xs font-mono font-bold tracking-wider truncate ${stateConfig.text}`}>
                {stateConfig.label}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight mt-0.5 truncate">
              {stateConfig.sub}
            </p>
          </div>
        </div>

        <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded shrink-0 ${stateConfig.bg} border ${stateConfig.border} ${stateConfig.text}`}>
          {stateConfig.badge}
        </span>
      </section>

      {/* 4. Sensor Matrix — Reflows into 1 col on narrow screens, 2 cols on mobile/tablet, and up to 4 cols on wide viewports */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Primary Sensor Telemetry
          </h2>
          <button
            onClick={() => onNavigateTab('monitor')}
            className="text-[11px] text-[#10E575] hover:underline flex items-center gap-0.5"
          >
            <span>All Channels</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Adaptive Grid: 1 col on <370px, 2 cols on standard mobile/tablet, 4 cols on wide display */}
        <div className="grid grid-cols-1 min-[370px]:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <TemperatureArcGauge
            reading={tempReading}
            unit={tempUnit}
            onToggleUnit={onToggleTempUnit}
          />
          <HumiditySparkChart reading={humReading} />
          <GasSmokeLevelMeter reading={gasReading} />
          <FlameOpticalDetector reading={flameReading} />
        </div>
      </section>

      {/* 5. Visually Distinctive Recent-Events Timeline */}
      <section className="mt-1 flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Audit Event Log
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('incidents')}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors"
          >
            <span>View All ({incidents.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {recentIncidents.map((inc) => {
            const isCrit = inc.severity === 'critical';
            const isWarn = inc.severity === 'medium';
            const badgeColor = isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-[#10E575]';

            return (
              <div
                key={inc.id}
                className="p-3 rounded-xl bg-[#11161F] border border-white/5 hover:border-white/10 transition-colors flex items-start justify-between gap-2.5 min-w-0"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9.5px] sm:text-[10px] font-mono font-bold uppercase shrink-0 ${badgeColor}`}>
                      {inc.severity}
                    </span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-xs font-semibold text-white truncate flex-1 min-w-0">
                      {inc.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {inc.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                    <span className="truncate">{inc.zone}</span>
                    <span>·</span>
                    <span className="shrink-0">{inc.timestamp}</span>
                  </div>
                </div>

                {inc.resolved && (
                  <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-mono text-[#10E575] bg-[#10E575]/10 px-2 py-0.5 rounded shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Logged</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
