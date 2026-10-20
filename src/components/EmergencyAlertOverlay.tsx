import React from 'react';
import { EmergencyAlert } from '../types/safeplant';
import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Radio, 
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

interface EmergencyAlertOverlayProps {
  alert: EmergencyAlert | null;
  onAcknowledge: (alertId: string) => void;
  onViewIncidentDetails: (incidentId: string) => void;
  reducedMotion?: boolean;
}

export const EmergencyAlertOverlay: React.FC<EmergencyAlertOverlayProps> = ({
  alert,
  onAcknowledge,
  onViewIncidentDetails,
  reducedMotion = false,
}) => {
  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL';
  const bgColor = isCritical ? 'bg-[#18090B]' : 'bg-[#181309]';
  const borderColor = isCritical ? 'border-red-500/80' : 'border-amber-500/80';
  const textColor = isCritical ? 'text-red-400' : 'text-amber-400';
  const badgeBg = isCritical ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  const glowShadow = isCritical 
    ? 'shadow-[0_0_50px_rgba(239,68,68,0.35)]' 
    : 'shadow-[0_0_50px_rgba(245,158,11,0.35)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className={`w-full max-w-lg rounded-2xl sm:rounded-3xl border-2 ${bgColor} ${borderColor} ${glowShadow} overflow-hidden flex flex-col max-h-[92dvh] transition-all relative my-auto shadow-2xl`}
        role="alertdialog"
        aria-labelledby="alert-hazard-title"
        aria-describedby="alert-hazard-desc"
      >
        {/* Top Emergency Strobe Banner - Fixed at modal top */}
        <div className={`w-full py-1.5 sm:py-2 px-3 sm:px-4 flex items-center justify-between font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest shrink-0 ${
          isCritical ? 'bg-red-500 text-black' : 'bg-amber-500 text-black'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <AlertOctagon className="w-4 h-4 shrink-0 animate-bounce" />
            <span className="truncate">CONFIRMED {alert.severity} HAZARD</span>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-bold shrink-0">OSHA PRIORITY 1</span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 flex flex-col gap-3 sm:gap-4 text-slate-100 overflow-y-auto overscroll-contain">
          {/* Main Title & Sensor Metric */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${badgeBg}`}>
                {alert.severity} ALERT
              </span>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{alert.timestamp}</span>
              </div>
            </div>

            <h2 id="alert-hazard-title" className="text-lg sm:text-2xl font-extrabold text-white tracking-tight mt-1 leading-tight">
              {alert.title}
            </h2>
            <p id="alert-hazard-desc" className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {alert.message}
            </p>
          </div>

          {/* Actual Sensor Metric & Origin Panel */}
          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 font-mono">
            <div>
              <span className="text-[9.5px] sm:text-[10px] text-slate-400 block uppercase">Triggering Metric</span>
              <span className={`text-base sm:text-lg font-bold ${textColor}`}>
                {alert.actualMetric || 'CRITICAL LEVEL'}
              </span>
            </div>

            <div>
              <span className="text-[9.5px] sm:text-[10px] text-slate-400 block uppercase">Sensor Source</span>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-white font-medium truncate">
                <Radio className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{alert.sensorSource}</span>
              </div>
            </div>

            <div className="min-[340px]:col-span-2 pt-1 border-t border-white/5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Location: <strong className="text-white">{alert.zone}</strong></span>
            </div>
          </div>

          {/* Actionable Safety Instructions */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Mandatory Safety Protocols
            </span>
            <div className="flex flex-col gap-1 sm:gap-1.5">
              {alert.safetyInstructions.map((instruction, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-300 bg-white/5 p-2 rounded-xl border border-white/5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-mono text-[9px] sm:text-[10px] font-bold ${
                    isCritical ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="leading-tight">{instruction}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons: Acknowledge & View Details - Always accessible */}
          <div className="pt-2 flex flex-col min-[380px]:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => onAcknowledge(alert.id)}
              className={`w-full min-[380px]:flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 ${
                isCritical
                  ? 'bg-red-500 hover:bg-red-400 text-black shadow-lg shadow-red-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Acknowledge Hazard</span>
            </button>

            <button
              onClick={() => {
                onViewIncidentDetails(alert.incidentId);
              }}
              className="w-full min-[380px]:w-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Incident Timeline</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
