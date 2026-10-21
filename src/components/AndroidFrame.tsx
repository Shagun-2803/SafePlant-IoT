import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  BatteryMedium, 
  ShieldCheck, 
  Activity, 
  Camera, 
  AlertOctagon, 
  Sliders, 
  Code2, 
  Smartphone, 
  Maximize2
} from 'lucide-react';
import { ConnectionStatus, SystemSafetyState } from '../types/safeplant';

export type MainNavDestination = 'dashboard' | 'readings' | 'camera' | 'incidents' | 'settings';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab: MainNavDestination;
  onTabChange: (tab: MainNavDestination) => void;
  systemState: SystemSafetyState;
  connectionStatus: ConnectionStatus;
  incidentCount: number;
  onOpenCodeModal: () => void;
  onOpenSettings: () => void;
  onTriggerTestEmergencyAlert?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeTab,
  onTabChange,
  systemState,
  connectionStatus,
  incidentCount,
  onOpenCodeModal,
  onOpenSettings,
  onTriggerTestEmergencyAlert,
}) => {
  const [deviceView, setDeviceView] = useState<'mobile' | 'fullscreen'>('mobile');
  const [currentTime, setCurrentTime] = useState('14:30');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090C] text-slate-100 flex flex-col items-center justify-start pb-6">
      {/* Top Professional Control Bar for AI Studio Preview */}
      <div className="w-full bg-[#0D1117] border-b border-white/10 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs z-50">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10E575] shadow-[0_0_8px_#10E575]" />
            <span className="font-semibold text-white tracking-wide">SafePlant AIoT Android App</span>
          </div>
          <span className="hidden sm:inline text-slate-500">·</span>
          <span className="hidden sm:inline text-slate-400 font-mono text-[11px]">
            Kotlin · Jetpack Compose · Material 3 · CameraX · FastAPI
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Settings Top Bar Action */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#10E575]/20 border-[#10E575]/40 text-[#10E575]'
                : 'bg-[#151B22] border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Open Threshold Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-[#10E575]" />
            <span>Settings</span>
          </button>

          {/* Test Emergency Alert Overlay Trigger */}
          {onTriggerTestEmergencyAlert && (
            <button
              onClick={onTriggerTestEmergencyAlert}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-colors font-mono text-[11px]"
              title="Test In-App Critical Hazard Overlay"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Test Alert</span>
            </button>
          )}

          {/* Device Frame View Switch */}
          <div className="flex items-center bg-[#151B22] rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded transition-colors ${
                deviceView === 'mobile' ? 'bg-[#232D3B] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Device Frame"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView('fullscreen')}
              className={`p-1.5 rounded transition-colors ${
                deviceView === 'fullscreen' ? 'bg-[#232D3B] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Fluid Fullscreen Canvas"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Compose Code Button */}
          <button
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1F2733] border border-white/10 text-white hover:bg-[#2B3545] transition-all font-medium text-[11px]"
          >
            <Code2 className="w-3.5 h-3.5 text-[#10E575]" />
            <span>Compose Code</span>
          </button>
        </div>
      </div>

      {/* Main Container: Mobile Frame or Fullscreen */}
      <div className={`w-full flex justify-center py-2 sm:py-4 px-0 sm:px-4 ${deviceView === 'fullscreen' ? 'max-w-6xl' : ''}`}>
        <div
          className={`w-full transition-all duration-300 relative bg-[#0B0E12] shadow-2xl flex flex-col ${
            deviceView === 'mobile'
              ? 'max-w-[430px] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none rounded-[36px] sm:rounded-[44px] border-4 sm:border-[10px] border-[#1C222B] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] h-[88dvh] min-h-[580px] max-h-[920px] overflow-hidden'
              : 'rounded-2xl border border-white/10 h-[88dvh] min-h-[580px] max-h-[920px] overflow-hidden'
          }`}
        >
          {/* Android Speaker Grill & Camera Punch-hole (Mobile Frame Only) */}
          {deviceView === 'mobile' && (
            <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 items-center gap-2 z-50 pointer-events-none">
              <div className="w-12 h-1 bg-[#2C3542] rounded-full" />
              <div className="w-3 h-3 bg-black rounded-full border border-white/10" />
            </div>
          )}

          {/* Android 15 Material 3 Status Bar */}
          <div className="w-full pt-2.5 sm:pt-3 px-3 sm:px-5 pb-1 flex items-center justify-between text-xs text-slate-300 select-none z-40 bg-[#0B0E12]/95 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-[12px] sm:text-[13px] text-white tabular-nums">{currentTime}</span>
              
              {/* Connection Status Pill */}
              <div className={`flex items-center gap-1 text-[9px] sm:text-[9.5px] font-mono px-2 py-0.5 rounded-full border ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-[#10E575]/15 border-[#10E575]/30 text-[#10E575]'
                  : connectionStatus === 'RECONNECTING'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : connectionStatus === 'STALE_DATA'
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                  : connectionStatus === 'CONNECTING'
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-300 animate-pulse'
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  connectionStatus === 'CONNECTED'
                    ? 'bg-[#10E575]'
                    : connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING'
                    ? 'bg-amber-400 animate-ping'
                    : connectionStatus === 'STALE_DATA'
                    ? 'bg-orange-400'
                    : 'bg-red-500'
                }`} />
                <span className="truncate max-w-[90px] sm:max-w-none">
                  {connectionStatus === 'CONNECTED' ? 'CONNECTED' : connectionStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Hardware System Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[9.5px] font-mono text-slate-400 hidden min-[360px]:inline">FASTAPI</span>
              <Wifi className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-300" />
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">98%</span>
                <BatteryMedium className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-300" />
              </div>
            </div>
          </div>

          {/* Screen Content Scrollable Area: generous bottom padding so bottom content is never obscured */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0B0E12] scroll-smooth overscroll-contain">
            <div className="min-h-full pb-20 sm:pb-24">
              {children}
            </div>
          </div>

          {/* Android Material 3 Bottom Navigation Bar: Streamlined Height */}
          <nav aria-label="Main Navigation" className="absolute bottom-0 left-0 right-0 z-40 bg-[#10141B]/95 backdrop-blur-xl border-t border-white/10 pt-1.5 pb-2.5 px-3">
            <div className="grid grid-cols-4 gap-1 items-center max-w-sm mx-auto">
              {/* Destination 1: Dashboard */}
              <button
                onClick={() => onTabChange('dashboard')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                    activeTab === 'dashboard' ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Dashboard
                </span>
              </button>

              {/* Destination 2: Readings */}
              <button
                onClick={() => onTabChange('readings')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'readings'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                    activeTab === 'readings' ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Readings
                </span>
              </button>

              {/* Destination 3: Camera */}
              <button
                onClick={() => onTabChange('camera')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'camera'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                    activeTab === 'camera' ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Camera
                </span>
              </button>

              {/* Destination 4: Incidents */}
              <button
                onClick={() => onTabChange('incidents')}
                className="flex flex-col items-center justify-center py-1 relative group transition-transform active:scale-95"
              >
                <div
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-all relative ${
                    activeTab === 'incidents'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4" />
                  {incidentCount > 0 && (
                    <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[8px] font-bold flex items-center justify-center">
                      {incidentCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                    activeTab === 'incidents' ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Incidents
                </span>
              </button>
            </div>

            {/* Android Navigation Pill Bar Indicator */}
            <div className="w-20 h-1 bg-white/20 rounded-full mx-auto mt-1" />
          </nav>
        </div>
      </div>
    </div>
  );
};
