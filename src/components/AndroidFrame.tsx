import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  BatteryMedium, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Eye, 
  AlertOctagon, 
  Sliders, 
  Code2, 
  Smartphone, 
  Maximize2, 
  Radio,
  Zap,
  RotateCcw
} from 'lucide-react';
import { OperatingMode, ConnectionStatus, SystemSafetyState } from '../types/safeplant';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab: 'overview' | 'monitor' | 'vision' | 'incidents' | 'settings';
  onTabChange: (tab: 'overview' | 'monitor' | 'vision' | 'incidents' | 'settings') => void;
  systemState: SystemSafetyState;
  operatingMode: OperatingMode;
  onToggleMode: () => void;
  connectionStatus: ConnectionStatus;
  incidentCount: number;
  onOpenCodeModal: () => void;
  onSimulateHazard: (type: 'gas' | 'flame' | 'temp' | 'reset') => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeTab,
  onTabChange,
  systemState,
  operatingMode,
  onToggleMode,
  connectionStatus,
  incidentCount,
  onOpenCodeModal,
  onSimulateHazard,
}) => {
  const [deviceView, setDeviceView] = useState<'mobile' | 'fullscreen'>('mobile');
  const [currentTime, setCurrentTime] = useState('13:24');

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
      <div className="w-full bg-[#0D1117] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10E575] shadow-[0_0_8px_#10E575]" />
            <span className="font-semibold text-white tracking-wide">SafePlant Android Preview</span>
          </div>
          <span className="hidden sm:inline text-slate-400">·</span>
          <span className="hidden sm:inline text-slate-300 font-mono text-[11px]">
            Jetpack Compose · Material 3 Architecture
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Simulation Trigger (for inspecting states) */}
          <div className="flex items-center bg-[#151B22] rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => onSimulateHazard('reset')}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                systemState === 'NOMINAL' ? 'bg-[#10E575]/20 text-[#10E575] font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Reset to Normal Baseline"
            >
              Normal
            </button>
            <button
              onClick={() => onSimulateHazard('gas')}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                systemState === 'WARNING' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Simulate Elevated Gas Vapor Spike"
            >
              Gas Spike
            </button>
            <button
              onClick={() => onSimulateHazard('flame')}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                systemState === 'CRITICAL' ? 'bg-red-500/20 text-red-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Simulate Critical Fire Hazard"
            >
              Fire Alert
            </button>
          </div>

          {/* Mode Switch Button */}
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
              operatingMode === 'DEMO'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-[#10E575]/10 border-[#10E575]/30 text-[#10E575] hover:bg-[#10E575]/20'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{operatingMode === 'DEMO' ? 'DEMO MODE' : 'HARDWARE MODE'}</span>
          </button>

          {/* Device Frame View Switch */}
          <div className="flex items-center bg-[#151B22] rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded transition-colors ${
                deviceView === 'mobile' ? 'bg-[#232D3B] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Android Pixel 8 Pro Device Shell"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView('fullscreen')}
              className={`p-1.5 rounded transition-colors ${
                deviceView === 'fullscreen' ? 'bg-[#232D3B] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Fluid Fullscreen / Tablet Canvas"
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
      <div className={`w-full flex justify-center py-4 px-2 sm:px-4 ${deviceView === 'fullscreen' ? 'max-w-6xl' : ''}`}>
        <div
          className={`w-full transition-all duration-300 relative bg-[#0B0E12] shadow-2xl flex flex-col ${
            deviceView === 'mobile'
              ? 'max-w-[430px] rounded-[44px] border-[10px] border-[#1C222B] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] min-h-[880px] overflow-hidden'
              : 'rounded-2xl border border-white/10 min-h-[850px] overflow-hidden'
          }`}
        >
          {/* Android Speaker Grill & Camera Punch-hole (Mobile Frame Only) */}
          {deviceView === 'mobile' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none">
              <div className="w-12 h-1 bg-[#2C3542] rounded-full" />
              <div className="w-3 h-3 bg-black rounded-full border border-white/10" />
            </div>
          )}

          {/* Android 15 Material 3 Status Bar */}
          <div className="w-full pt-3 px-6 pb-1 flex items-center justify-between text-xs text-slate-300 select-none z-40 bg-[#0B0E12]/95 backdrop-blur-md">
            <span className="font-semibold tracking-tight text-[13px] text-white">{currentTime}</span>

            {/* Hardware Mode indicator & System Icons */}
            <div className="flex items-center gap-2.5">
              <span className={`text-[9.5px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                operatingMode === 'DEMO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-[#10E575]/20 text-[#10E575] border border-[#10E575]/30'
              }`}>
                {operatingMode}
              </span>
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono text-slate-400">96%</span>
                <BatteryMedium className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
          </div>

          {/* Screen Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 bg-[#0B0E12]">
            {children}
          </div>

          {/* Android Material 3 Bottom Navigation Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#10141B]/95 backdrop-blur-xl border-t border-white/5 pt-2 pb-5 px-3">
            <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
              {/* Tab 1: Overview */}
              <button
                onClick={() => onTabChange('overview')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    activeTab === 'overview' ? 'text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Overview
                </span>
              </button>

              {/* Tab 2: Monitor */}
              <button
                onClick={() => onTabChange('monitor')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'monitor'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    activeTab === 'monitor' ? 'text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Monitor
                </span>
              </button>

              {/* Tab 3: AI Vision */}
              <button
                onClick={() => onTabChange('vision')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'vision'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    activeTab === 'vision' ? 'text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  AI Vision
                </span>
              </button>

              {/* Tab 4: Incidents */}
              <button
                onClick={() => onTabChange('incidents')}
                className="flex flex-col items-center justify-center py-1 relative group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-8 rounded-full flex items-center justify-center transition-all relative ${
                    activeTab === 'incidents'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                  {incidentCount > 0 && (
                    <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                      {incidentCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    activeTab === 'incidents' ? 'text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Incidents
                </span>
              </button>

              {/* Tab 5: Settings */}
              <button
                onClick={() => onTabChange('settings')}
                className="flex flex-col items-center justify-center py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'settings'
                      ? 'bg-[#10E575]/20 text-[#10E575]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    activeTab === 'settings' ? 'text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Settings
                </span>
              </button>
            </div>

            {/* Android Navigation Pill Bar Indicator */}
            <div className="w-24 h-1 bg-white/20 rounded-full mx-auto mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
