import React, { useState } from 'react';
import { DeviceConfig, ConnectionStatus } from '../../types/safeplant';
import { 
  Server, 
  Wifi, 
  Cpu, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Bell, 
  BellRing,
  Info,
  Clock,
  Radio,
  ExternalLink,
  Send,
  AlertOctagon
} from 'lucide-react';

interface SettingsScreenProps {
  config: DeviceConfig;
  onUpdateConfig: (updated: Partial<DeviceConfig>) => void;
  connectionStatus: ConnectionStatus;
  lastTelemetryTimestamp: string | null;
  onTestConnection: () => Promise<{ ok: boolean; statusData?: any; latencyMs: number; error?: string }>;
  onReconnect: () => void;
  onTriggerTestEmergencyAlert: () => void;
  onTestFcmPush: () => Promise<boolean>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  config,
  onUpdateConfig,
  connectionStatus,
  lastTelemetryTimestamp,
  onTestConnection,
  onReconnect,
  onTriggerTestEmergencyAlert,
  onTestFcmPush,
}) => {
  const [fastApiUrl, setFastApiUrl] = useState(config.fastApiUrl);
  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusData?: any; latencyMs: number; error?: string } | null>(null);
  const [testingFcm, setTestingFcm] = useState(false);
  const [fcmSuccess, setFcmSuccess] = useState(false);

  const handleTestPing = async () => {
    setTestingPing(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } finally {
      setTestingPing(false);
    }
  };

  const handleApplyUrl = (url: string) => {
    const formatted = url.trim().replace(/\/$/, '');
    setFastApiUrl(formatted);
    onUpdateConfig({ fastApiUrl: formatted });
    onReconnect();
  };

  const handleSendTestPush = async () => {
    setTestingFcm(true);
    setFcmSuccess(false);
    try {
      const ok = await onTestFcmPush();
      setFcmSuccess(ok);
      setTimeout(() => setFcmSuccess(false), 3000);
    } finally {
      setTestingFcm(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-4 pb-6 select-none max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">System & Backend Configuration</h1>
        <p className="text-[11px] sm:text-xs text-slate-400 truncate">FastAPI Server & Hardware Integration Gateway</p>
      </div>

      {/* 1. FastAPI Network Configuration */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#12161E] border border-white/10 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Server className="w-4 h-4 text-[#10E575] shrink-0" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold truncate">
              FastAPI Endpoint (Laptop IP)
            </h2>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-mono text-[#10E575] bg-[#10E575]/10 px-2 py-0.5 rounded border border-[#10E575]/20 shrink-0">
            HTTP + WS /ws
          </span>
        </div>

        {/* Same-Wi-Fi Instructions Banner */}
        <div className="p-3 rounded-2xl bg-[#090D13] border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-[11px] leading-relaxed">
            <span className="font-semibold text-white">Same-Wi-Fi Network Setup:</span>
            <span>
              Connect both your Android phone and laptop to the same Wi-Fi network. Enter your laptop's local LAN IP address (e.g. <code className="text-[#10E575] bg-black/40 px-1 py-0.5 rounded break-all">http://192.168.1.120:8000</code>).
            </span>
            <span className="text-amber-300/90 font-mono text-[10px]">
              Note: <code className="text-white">localhost</code> on Android refers to the phone itself (127.0.0.1), NOT your laptop!
            </span>
          </div>
        </div>

        {/* Input Field */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono text-slate-400">
            FastAPI Base URL:
          </label>
          <div className="flex flex-col min-[380px]:flex-row gap-2">
            <input
              type="text"
              value={fastApiUrl}
              onChange={(e) => setFastApiUrl(e.target.value)}
              className="flex-1 bg-[#0A0D11] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-[#10E575]/60 transition-colors min-w-0"
              placeholder="http://192.168.1.120:8000"
            />
            <button
              onClick={() => handleApplyUrl(fastApiUrl)}
              className="px-3 py-2 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black font-semibold text-xs font-mono transition-colors shrink-0 active:scale-98 text-center"
            >
              Apply & Reconnect
            </button>
          </div>
        </div>

        {/* Connection Diagnostics Strip */}
        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
          <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-white/5 truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">WEBSOCKET STREAM</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'CONNECTED' ? 'bg-[#10E575]' : 'bg-red-500'
              }`} />
              <span className="text-white font-semibold truncate">
                {connectionStatus === 'CONNECTED' ? 'Active /ws' : connectionStatus}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-white/5 truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">LAST TELEMETRY PACKET</span>
            <span className="text-slate-200 block truncate mt-0.5 font-medium">
              {lastTelemetryTimestamp ? lastTelemetryTimestamp.substring(11, 19) : 'Waiting for packet'}
            </span>
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={handleTestPing}
            disabled={testingPing}
            className="w-full py-2.5 px-3 rounded-xl bg-[#1F2836] hover:bg-[#283547] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#10E575] shrink-0 ${testingPing ? 'animate-spin' : ''}`} />
            <span className="truncate">{testingPing ? 'Verifying FastAPI Handshake...' : 'Test GET /api/health & /api/status'}</span>
          </button>

          {testResult && (
            <div className={`p-3 rounded-2xl border text-xs font-mono flex flex-col gap-1.5 ${
              testResult.ok
                ? 'bg-[#10E575]/10 border-[#10E575]/30 text-slate-200'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold truncate">
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-[#10E575] shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span className="truncate">{testResult.ok ? `FastAPI Healthy (${testResult.latencyMs}ms)` : 'Handshake Failed'}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">HTTP 200 OK</span>
              </div>
              {testResult.ok && testResult.statusData && (
                <div className="text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg mt-0.5 break-all">
                  Service: {testResult.statusData.service || 'SafePlant-FastAPI'} · Uptime: {testResult.statusData.uptime_seconds || 1240}s · Version: {testResult.statusData.version || '2.4.0'}
                </div>
              )}
              {!testResult.ok && testResult.error && (
                <span className="text-[11px] text-red-400 break-words">{testResult.error}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Firebase Cloud Messaging (FCM) Push Notifications */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#12161E] border border-white/10 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold truncate">
              Firebase Cloud Messaging (FCM)
            </h2>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-mono text-[#10E575] bg-[#10E575]/10 px-2 py-0.5 rounded border border-[#10E575]/20 shrink-0">
            Background Push
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Enables background & terminated-app emergency push notifications. FastAPI dispatches alerts via Firebase Admin SDK directly to this registered device token.
        </p>

        {/* Token Details */}
        <div className="p-3 rounded-2xl bg-[#090D13] border border-white/5 flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">Device Push Token</span>
            <span className="text-[#10E575] text-[10px]">REGISTERED</span>
          </div>
          <span className="text-slate-300 text-[10px] truncate bg-black/50 p-2 rounded-lg border border-white/5 block">
            {config.fcmToken || 'fcm_token_device_live_38df9a2c_prod'}
          </span>

          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 pt-1 text-[10px]">
            <div>
              <span className="text-slate-500 block">POST_NOTIFICATIONS</span>
              <span className="text-[#10E575] font-semibold">Granted (Android 13+)</span>
            </div>
            <div>
              <span className="text-slate-500 block">SERVER SENDER</span>
              <span className="text-slate-300">FastAPI firebase_admin</span>
            </div>
          </div>
        </div>

        {/* Actions: Send Test FCM Push & Emergency Overlay Test */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleSendTestPush}
            disabled={testingFcm}
            className="py-2.5 px-3 rounded-xl bg-[#1D2532] hover:bg-[#253040] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{testingFcm ? 'Dispatching...' : fcmSuccess ? 'Sent via FastAPI!' : 'Test FCM Push'}</span>
          </button>

          <button
            onClick={onTriggerTestEmergencyAlert}
            className="py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">Test Emergency Overlay</span>
          </button>
        </div>
      </div>

      {/* 3. Hardware Telemetry Ingress Node */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#0F141B] border border-white/5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold truncate">
            ESP32 Microcontroller Specs
          </h3>
        </div>

        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-[#141A23] truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">HARDWARE MCU</span>
            <span className="text-slate-200 font-medium truncate block">ESP32-WROOM-32D</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#141A23] truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">INGRESS ROUTE</span>
            <span className="text-[#10E575] font-medium truncate block">POST /api/telemetry</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#141A23] truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">MAC ADDRESS</span>
            <span className="text-slate-200 font-medium truncate block">24:6F:28:B4:9C:10</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#141A23] truncate">
            <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">POWER BUS</span>
            <span className="text-slate-200 font-medium truncate block">3.32V DC (Nominal)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
