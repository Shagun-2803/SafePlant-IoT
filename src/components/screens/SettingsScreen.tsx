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
  MessageSquare, 
  Info, 
  Clock, 
  X,
  Thermometer,
  Wind,
  Flame,
  Droplets,
  Eye,
  Smartphone,
  Save
} from 'lucide-react';

interface SettingsScreenProps {
  config: DeviceConfig;
  onUpdateConfig: (updated: Partial<DeviceConfig>) => Promise<{ ok: boolean; error?: string }> | void;
  connectionStatus: ConnectionStatus;
  lastTelemetryTimestamp: string | null;
  onTestConnection: () => Promise<{ ok: boolean; statusData?: any; latencyMs: number; error?: string }>;
  onReconnect: () => void;
  onClose?: () => void;
  onTestFcmPush?: () => Promise<{ delivered: boolean; status: string; message?: string }>;
  onTestSms?: () => Promise<{ delivered: boolean; status: string; message?: string }>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  config,
  onUpdateConfig,
  connectionStatus,
  lastTelemetryTimestamp,
  onTestConnection,
  onReconnect,
  onClose,
  onTestFcmPush,
  onTestSms
}) => {
  // Form State for all 14 Section 7 Settings
  const [fastApiUrl, setFastApiUrl] = useState(config.fastApiUrl);
  const [tempWarn, setTempWarn] = useState(config.tempWarningThreshold);
  const [tempCrit, setTempCrit] = useState(config.tempCriticalThreshold);
  const [gasWarn, setGasWarn] = useState(config.gasWarningThreshold);
  const [gasCrit, setGasCrit] = useState(config.gasCriticalThreshold);
  const [humidityWarn, setHumidityWarn] = useState<number | null>(config.humidityWarningThreshold);
  const [humidityCrit, setHumidityCrit] = useState<number | null>(config.humidityCriticalThreshold);
  
  const [flameEnabled, setFlameEnabled] = useState(config.flameEventEnabled);
  const [tempNotify, setTempNotify] = useState(config.tempNotificationsEnabled);
  const [gasNotify, setGasNotify] = useState(config.gasNotificationsEnabled);
  const [humidityNotify, setHumidityNotify] = useState(config.humidityNotificationsEnabled);
  const [flameNotify, setFlameNotify] = useState(config.flameNotificationsEnabled);

  const [intrusionAlert, setIntrusionAlert] = useState(config.intrusionAlertEnabled);
  const [intrusionCooldown, setIntrusionCooldown] = useState(config.intrusionReminderCooldownSec);
  const [exitDuration, setExitDuration] = useState(config.exitConfirmationSec);
  const [staleTimeout, setStaleTimeout] = useState(config.telemetryStaleTimeoutSec);
  const [smsPhone, setSmsPhone] = useState(config.smsDestinationNumber);
  const [fcmNotify, setFcmNotify] = useState(config.fcmNotificationsEnabled);
  const [smsNotify, setSmsNotify] = useState(config.smsNotificationsEnabled);

  // Status & Validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ping Test State
  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusData?: any; latencyMs: number; error?: string } | null>(null);

  // Provider Dispatch Test State
  const [fcmTestStatus, setFcmTestStatus] = useState<{ status: string; message?: string } | null>(null);
  const [smsTestStatus, setSmsTestStatus] = useState<{ status: string; message?: string } | null>(null);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveSuccess(false);

    // Validation 1: Warning < Critical
    if (Number(tempWarn) >= Number(tempCrit)) {
      setValidationError('Temperature warning threshold must be strictly less than critical threshold.');
      return;
    }
    if (Number(gasWarn) >= Number(gasCrit)) {
      setValidationError('Gas warning threshold must be strictly less than critical threshold.');
      return;
    }
    if (humidityWarn !== null && humidityCrit !== null && Number(humidityWarn) >= Number(humidityCrit)) {
      setValidationError('Humidity warning threshold must be less than critical threshold.');
      return;
    }

    // Validation 2: Phone number
    const cleanedPhone = smsPhone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,13}$/.test(cleanedPhone)) {
      setValidationError('Please provide a valid Indian (+91) or E.164 phone number.');
      return;
    }

    // Validation 3: Positive timeouts
    if (intrusionCooldown < 1 || exitDuration < 1 || staleTimeout < 3) {
      setValidationError('Intrusion cooldown and exit duration must be >= 1s. Stale timeout must be >= 3s.');
      return;
    }

    setSaving(true);
    try {
      const updated: Partial<DeviceConfig> = {
        fastApiUrl,
        tempWarningThreshold: Number(tempWarn),
        tempCriticalThreshold: Number(tempCrit),
        gasWarningThreshold: Number(gasWarn),
        gasCriticalThreshold: Number(gasCrit),
        humidityWarningThreshold: humidityWarn ? Number(humidityWarn) : null,
        humidityCriticalThreshold: humidityCrit ? Number(humidityCrit) : null,
        flameEventEnabled: flameEnabled,
        tempNotificationsEnabled: tempNotify,
        gasNotificationsEnabled: gasNotify,
        humidityNotificationsEnabled: humidityNotify,
        flameNotificationsEnabled: flameNotify,
        intrusionAlertEnabled: intrusionAlert,
        intrusionReminderCooldownSec: Number(intrusionCooldown),
        exitConfirmationSec: Number(exitDuration),
        telemetryStaleTimeoutSec: Number(staleTimeout),
        smsDestinationNumber: smsPhone,
        fcmNotificationsEnabled: fcmNotify,
        smsNotificationsEnabled: smsNotify
      };

      const res = await onUpdateConfig(updated);
      if (res && res.error) {
        setValidationError(`Backend error: ${res.error}`);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestFcm = async () => {
    if (onTestFcmPush) {
      const res = await onTestFcmPush();
      setFcmTestStatus(res);
    }
  };

  const handleTestSms = async () => {
    if (onTestSms) {
      const res = await onTestSms();
      setSmsTestStatus(res);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 text-slate-100 max-w-2xl mx-auto">
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#10E575]" />
            <span>Threshold & Alert Configuration</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            Persistent Backend Settings · Section 7 Specifications
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Return to Dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prototype Disclaimer Banner (Section 7 Requirement) */}
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300 font-mono">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold block text-white">PROTOTYPE DEFAULTS ONLY:</span>
          These values are prototype demonstration thresholds and must not be treated as certified industrial life-safety limits.
        </div>
      </div>

      {/* Validation or Save Success Banners */}
      {validationError && (
        <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 font-mono text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Threshold configuration validated and saved to persistent backend.</span>
        </div>
      )}

      {/* 2. Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
        {/* Section 14: Network & Backend Configuration */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#10E575]" />
              <h2 className="text-xs font-bold text-white tracking-wide">FastAPI Backend Connection</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Section 14</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-slate-300">BACKEND BASE URL (LAN IP or Host)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fastApiUrl}
                onChange={(e) => setFastApiUrl(e.target.value)}
                placeholder="http://192.168.1.120:8000"
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestPing}
                disabled={testingPing}
                className="px-3 py-2 rounded-xl bg-[#1C2533] hover:bg-[#253245] text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-white/5 transition-colors"
              >
                {testingPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10E575]" /> : <Wifi className="w-3.5 h-3.5 text-[#10E575]" />}
                <span>{testingPing ? 'Testing...' : 'Test Reachability'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-2.5 rounded-xl text-xs font-mono flex items-center justify-between border ${
              testResult.ok ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>
              <span>{testResult.ok ? `Endpoint Healthy (HTTP 200 · ${testResult.latencyMs}ms)` : `Failed: ${testResult.error}`}</span>
              <span className="text-[10px] text-slate-400">/api/health</span>
            </div>
          )}

          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
            Note: For native phone connectivity, enter your laptop's Wi-Fi LAN IP (e.g. http://192.168.x.x:8000). Avoid using "localhost" from a physical phone.
          </p>
        </div>

        {/* Section 7 Settings Group 1: Sensor Thresholds */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <h2 className="text-xs font-bold text-white tracking-wide">Hardware Sensor Thresholds</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Validated</span>
          </div>

          {/* Temperature Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">TEMPERATURE WARNING (°C)</label>
              <input
                type="number"
                step="0.5"
                value={tempWarn}
                onChange={(e) => setTempWarn(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
              <span className="text-[9px] text-slate-500">Default: 45.0°C</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">TEMPERATURE CRITICAL (°C)</label>
              <input
                type="number"
                step="0.5"
                value={tempCrit}
                onChange={(e) => setTempCrit(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-red-400 font-bold"
              />
              <span className="text-[9px] text-slate-500">Default: 50.0°C (Must be &gt; Warning)</span>
            </div>
          </div>

          {/* Gas / Smoke Thresholds (Raw ADC) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">MQ-2 GAS WARNING (Raw ADC)</label>
              <input
                type="number"
                value={gasWarn}
                onChange={(e) => setGasWarn(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
              <span className="text-[9px] text-slate-500">Range: 0–4095 · Default: 1500</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">MQ-2 GAS CRITICAL (Raw ADC)</label>
              <input
                type="number"
                value={gasCrit}
                onChange={(e) => setGasCrit(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-red-400 font-bold"
              />
              <span className="text-[9px] text-slate-500">Default: 2500 (Must be &gt; Warning)</span>
            </div>
          </div>

          {/* Optional Humidity Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">HUMIDITY CEILING WARNING (%RH)</label>
              <input
                type="number"
                value={humidityWarn ?? ''}
                onChange={(e) => setHumidityWarn(e.target.value ? Number(e.target.value) : null)}
                placeholder="Optional (e.g. 75)"
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">HUMIDITY CRITICAL (%RH)</label>
              <input
                type="number"
                value={humidityCrit ?? ''}
                onChange={(e) => setHumidityCrit(e.target.value ? Number(e.target.value) : null)}
                placeholder="Optional (e.g. 85)"
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 7 Settings Group 2: Event Triggers & Notification Preferences */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white tracking-wide">Sensor Event & Notification Preferences</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Channels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <label className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Optical Flame Detection Event</span>
              </div>
              <input
                type="checkbox"
                checked={flameEnabled}
                onChange={(e) => setFlameEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                <span>Temperature Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={tempNotify}
                onChange={(e) => setTempNotify(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>Gas / Smoke Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={gasNotify}
                onChange={(e) => setGasNotify(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Humidity Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={humidityNotify}
                onChange={(e) => setHumidityNotify(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Section 7 Settings Group 3: Intrusion, Cooldown & Telemetry Freshness */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-white tracking-wide">Intrusion & Timing Configuration</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Watchdog</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">REMINDER COOLDOWN (SEC)</label>
              <input
                type="number"
                min="3"
                value={intrusionCooldown}
                onChange={(e) => setIntrusionCooldown(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
              <span className="text-[9px] text-slate-500">Suppress repeated alerts</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">EXIT CONFIRMATION (SEC)</label>
              <input
                type="number"
                min="1"
                value={exitDuration}
                onChange={(e) => setExitDuration(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
              <span className="text-[9px] text-slate-500">Reset after person leaves</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">TELEMETRY STALE TIMEOUT (SEC)</label>
              <input
                type="number"
                min="3"
                value={staleTimeout}
                onChange={(e) => setStaleTimeout(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold"
              />
              <span className="text-[9px] text-slate-500">Mark data stale if silent</span>
            </div>
          </div>
        </div>

        {/* Section 7 Settings Group 4: SMS & FCM Notification Channels */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F131A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white tracking-wide">SMS (India MSG91) & FCM Push Channels</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Section 10 & 11</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-slate-300">SAFETY OFFICER SMS RECIPIENT PHONE (INDIA)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestSms}
                className="px-3 py-2 rounded-xl bg-[#1C2533] hover:bg-[#253245] text-slate-200 font-mono text-xs flex items-center gap-1 border border-white/5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Test SMS</span>
              </button>
            </div>
          </div>

          {smsTestStatus && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">MSG91 Status: {smsTestStatus.status}</span>
              </div>
              <span className="text-slate-300">{smsTestStatus.message}</span>
            </div>
          )}

          {/* FCM Push Notification Channel */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white block">Firebase Cloud Messaging (FCM)</span>
              <span className="text-[10px] font-mono text-slate-400">Android Foreground/Background High-Priority Alert Dispatch</span>
            </div>
            <button
              type="button"
              onClick={handleTestFcm}
              className="px-3 py-1.5 rounded-xl bg-[#1C2533] hover:bg-[#253245] text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-white/5"
            >
              <Bell className="w-3.5 h-3.5 text-[#10E575]" />
              <span>Test FCM</span>
            </button>
          </div>

          {fcmTestStatus && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#10E575]">FCM Status: {fcmTestStatus.status}</span>
              </div>
              <span className="text-slate-300">{fcmTestStatus.message}</span>
            </div>
          )}
        </div>

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black font-mono text-xs font-extrabold transition-colors shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
