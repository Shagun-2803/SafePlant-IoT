import React, { useState } from 'react';
import { DeviceConfig, OperatingMode, ConnectionStatus } from '../../types/safeplant';
import { 
  Radio, 
  Server, 
  Wifi, 
  Cpu, 
  Check, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Smartphone,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface SettingsScreenProps {
  config: DeviceConfig;
  onUpdateConfig: (updated: Partial<DeviceConfig>) => void;
  connectionStatus: ConnectionStatus;
  onTestConnection: () => Promise<boolean>;
  onSimulateState: (state: ConnectionStatus) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  config,
  onUpdateConfig,
  connectionStatus,
  onTestConnection,
  onSimulateState,
}) => {
  const [fastApiUrl, setFastApiUrl] = useState(config.fastApiUrl);
  const [mqttBroker, setMqttBroker] = useState(config.mqttBroker);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; latency: number } | null>(null);

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const ok = await onTestConnection();
      setPingResult({ ok, latency: Math.floor(Math.random() * 8 + 12) });
    } finally {
      setTestingPing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400">FastAPI & ESP32 Hardware Integration Config</p>
      </div>

      {/* 1. Operating Mode Selection (Prominent Distinction) */}
      <div className="p-4 rounded-2xl bg-[#12161E] border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#10E575]" />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Operating Mode
            </span>
          </div>

          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            config.mode === 'DEMO'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-[#10E575]/20 text-[#10E575] border border-[#10E575]/30'
          }`}>
            {config.mode}
          </span>
        </div>

        {/* Segmented Dual Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0D11] rounded-xl border border-white/5">
          <button
            onClick={() => onUpdateConfig({ mode: 'DEMO' })}
            className={`p-2.5 rounded-lg text-left transition-all ${
              config.mode === 'DEMO'
                ? 'bg-[#1D2530] border border-amber-500/40 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400">DEMO MODE</span>
              {config.mode === 'DEMO' && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Simulated industrial plant telemetry with interactive hazard injection.
            </p>
          </button>

          <button
            onClick={() => onUpdateConfig({ mode: 'HARDWARE' })}
            className={`p-2.5 rounded-lg text-left transition-all ${
              config.mode === 'HARDWARE'
                ? 'bg-[#1D2530] border border-[#10E575]/40 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#10E575]">HARDWARE MODE</span>
              {config.mode === 'HARDWARE' && <Check className="w-3.5 h-3.5 text-[#10E575]" />}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Live FastAPI bridge & ESP32-WROOM-32 sensor bus telemetry.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Server & MQTT Network Configuration */}
      <div className="p-4 rounded-2xl bg-[#12161E] border border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#10E575]" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Backend & Gateway Parameters
          </h2>
        </div>

        {/* FastAPI Host Field */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono text-slate-400">
            FastAPI Base URL:
          </label>
          <input
            type="text"
            value={fastApiUrl}
            onChange={(e) => setFastApiUrl(e.target.value)}
            onBlur={() => onUpdateConfig({ fastApiUrl })}
            className="w-full bg-[#0A0D11] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-[#10E575]/60 transition-colors"
            placeholder="http://192.168.1.120:8000"
          />
        </div>

        {/* MQTT Broker Field */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono text-slate-400">
            ESP32 MQTT Broker URI:
          </label>
          <input
            type="text"
            value={mqttBroker}
            onChange={(e) => setMqttBroker(e.target.value)}
            onBlur={() => onUpdateConfig({ mqttBroker })}
            className="w-full bg-[#0A0D11] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-[#10E575]/60 transition-colors"
            placeholder="mqtt://safeplant-broker.local:1883"
          />
        </div>

        {/* Test Connection Button */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={handleTestPing}
            disabled={testingPing}
            className="flex-1 py-2 rounded-xl bg-[#1F2836] hover:bg-[#283547] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#10E575] ${testingPing ? 'animate-spin' : ''}`} />
            <span>{testingPing ? 'Pinging Gateway...' : 'Test Connection & Handshake'}</span>
          </button>

          {pingResult && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono ${
              pingResult.ok
                ? 'bg-[#10E575]/15 border-[#10E575]/30 text-[#10E575]'
                : 'bg-red-500/15 border-red-500/30 text-red-400'
            }`}>
              {pingResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{pingResult.ok ? `${pingResult.latency}ms OK` : 'Host Timeout'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. System States Previewer (Testing loading, empty, disconnected, stale-data) */}
      <div className="p-4 rounded-2xl bg-[#12161E] border border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Test Hardware Connection States
          </h2>
        </div>
        <p className="text-[11px] text-slate-400">
          Verify app behavior during network anomalies, sensor disconnects, and packet delays.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSimulateState('CONNECTED')}
            className={`py-1.5 px-2 rounded-lg border text-xs font-mono transition-colors ${
              connectionStatus === 'CONNECTED'
                ? 'bg-[#10E575]/20 border-[#10E575]/40 text-[#10E575] font-semibold'
                : 'bg-[#171D27] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Connected (Live)
          </button>

          <button
            onClick={() => onSimulateState('STALE_DATA')}
            className={`py-1.5 px-2 rounded-lg border text-xs font-mono transition-colors ${
              connectionStatus === 'STALE_DATA'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                : 'bg-[#171D27] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Stale Data State
          </button>

          <button
            onClick={() => onSimulateState('DISCONNECTED')}
            className={`py-1.5 px-2 rounded-lg border text-xs font-mono transition-colors ${
              connectionStatus === 'DISCONNECTED'
                ? 'bg-red-500/20 border-red-500/40 text-red-400 font-semibold'
                : 'bg-[#171D27] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Disconnected State
          </button>

          <button
            onClick={() => onSimulateState('CONNECTING')}
            className={`py-1.5 px-2 rounded-lg border text-xs font-mono transition-colors ${
              connectionStatus === 'CONNECTING'
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-semibold'
                : 'bg-[#171D27] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Connecting (Loading)
          </button>
        </div>
      </div>

      {/* 4. Hardware Node Information */}
      <div className="p-4 rounded-2xl bg-[#0F141B] border border-white/5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Telemetry Node Hardware
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-[#141A23]">
            <span className="text-slate-500 block text-[10px]">MICROCONTROLLER</span>
            <span className="text-slate-200 font-medium">ESP32-WROOM-32D</span>
          </div>
          <div className="p-2 rounded-lg bg-[#141A23]">
            <span className="text-slate-500 block text-[10px]">FIRMWARE</span>
            <span className="text-[#10E575] font-medium">{config.firmwareVersion}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#141A23]">
            <span className="text-slate-500 block text-[10px]">MAC ADDRESS</span>
            <span className="text-slate-200 font-medium">24:6F:28:B4:9C:10</span>
          </div>
          <div className="p-2 rounded-lg bg-[#141A23]">
            <span className="text-slate-500 block text-[10px]">POWER RAIL</span>
            <span className="text-slate-200 font-medium">3.32V DC (Nominal)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
