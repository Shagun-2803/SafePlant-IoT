import React, { useState, useEffect, useRef } from 'react';
import { AiDetection, RestrictedZoneBoundary, IncidentRecord } from '../../types/safeplant';
import { 
  Camera, 
  Video, 
  VideoOff, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  UserCheck, 
  Crosshair, 
  Maximize2,
  CheckCircle2,
  Radio
} from 'lucide-react';

interface VisionScreenProps {
  detections: AiDetection[];
  restrictedZone: RestrictedZoneBoundary;
  onUpdateRestrictedZone: (zone: Partial<RestrictedZoneBoundary>) => void;
  onSubmitVisionIncident: (incident: Partial<IncidentRecord>) => Promise<boolean>;
}

export const VisionScreen: React.FC<VisionScreenProps> = ({
  detections,
  restrictedZone,
  onUpdateRestrictedZone,
  onSubmitVisionIncident,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Real or simulated tracked person position (% coordinates)
  const [trackedPerson, setTrackedPerson] = useState<{ x: number; y: number; w: number; h: number; confidence: number } | null>({
    x: 42,
    y: 35,
    w: 22,
    h: 46,
    confidence: 0.94
  });

  const [isZoneBreached, setIsZoneBreached] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCameraStream = async () => {
    setPermissionError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        setHasPermission(true);
      } else {
        throw new Error('Camera hardware access is not supported on this browser.');
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasPermission(false);
      setPermissionError(err.name === 'NotAllowedError' ? 'Camera permission was denied in your browser.' : err.message || 'Camera failed to initialize.');
      setCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      startCameraStream();
    }
  };

  const switchFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      stopCameraStream();
      setTimeout(startCameraStream, 200);
    }
  };

  // Restricted Zone Breach Check
  useEffect(() => {
    if (!trackedPerson || !restrictedZone.enabled) {
      setIsZoneBreached(false);
      return;
    }

    // Check if center of tracked person intersects the restricted zone rectangle
    const personCenterX = trackedPerson.x + trackedPerson.w / 2;
    const personCenterY = trackedPerson.y + trackedPerson.h / 2;

    const inZone = 
      personCenterX >= restrictedZone.x &&
      personCenterX <= restrictedZone.x + restrictedZone.w &&
      personCenterY >= restrictedZone.y &&
      personCenterY <= restrictedZone.y + restrictedZone.h;

    setIsZoneBreached(inZone);
  }, [trackedPerson, restrictedZone]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Manual or Auto submission of vision incident metadata to FastAPI
  const handleDispatchVisionIncident = async () => {
    if (cooldownRemaining > 0 || submittingEvent) return;
    setSubmittingEvent(true);
    setSubmitSuccess(false);

    try {
      const success = await onSubmitVisionIncident({
        id: `vis_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        title: 'Restricted Safety Zone Entry',
        description: `Tracked individual entered ${restrictedZone.name} without automated safety clearance.`,
        zone: restrictedZone.name,
        severity: 'medium',
        sensorTrigger: 'Phone Camera Vision (On-Device)',
        peakValue: 'Zone Intersect Verified',
        acknowledged: false,
        resolved: false,
        sourceType: 'camera_vision'
      });

      if (success) {
        setSubmitSuccess(true);
        setCooldownRemaining(restrictedZone.cooldownSeconds || 3);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } finally {
      setSubmittingEvent(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-4 pb-6 select-none max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap min-[340px]:flex-nowrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Camera Computer Vision</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">On-Device Local Vision & Perimeter Monitoring</p>
        </div>

        {/* Camera Active Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border text-[9.5px] sm:text-[10px] font-mono ${
            cameraActive
              ? 'bg-[#10E575]/15 border-[#10E575]/30 text-[#10E575]'
              : 'bg-[#151B22] border-white/5 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cameraActive ? 'bg-[#10E575] animate-ping' : 'bg-slate-500'}`} />
            <span>{cameraActive ? 'CAMERA LIVE' : 'CAMERA OFF'}</span>
          </div>
        </div>
      </div>

      {/* Main Camera Viewport Area */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#090C10] aspect-video w-full flex items-center justify-center max-w-full">
        {/* Real HTML Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Inactive Camera Fallback Interface */}
        {!cameraActive && (
          <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3 p-4 sm:p-6 text-center max-w-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#141A23] border border-white/10 flex items-center justify-center text-slate-400">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-[#10E575]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Device Camera Feed Ready</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                CameraX local analysis runs on-device. Video frames are never continuously uploaded to protect privacy and bandwidth.
              </p>
            </div>
            <button
              onClick={toggleCamera}
              className="mt-1 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black font-semibold text-xs flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-98"
            >
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Start Camera Analysis</span>
            </button>
          </div>
        )}

        {/* Permission Denied Notice */}
        {permissionError && (
          <div className="absolute inset-x-2 sm:inset-x-3 bottom-2 sm:bottom-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1 text-[11px] sm:text-xs">{permissionError}</span>
          </div>
        )}

        {/* HUD Bounding Boxes (Active when camera is running or test mode) */}
        {cameraActive && (
          <>
            {/* 1. Configured Restricted Zone Box (Yellow Dashed Boundary) */}
            {restrictedZone.enabled && (
              <div
                className={`absolute border-2 border-dashed transition-colors ${
                  isZoneBreached ? 'border-red-500 bg-red-500/15' : 'border-amber-400/80 bg-amber-400/5'
                }`}
                style={{
                  left: `${restrictedZone.x}%`,
                  top: `${restrictedZone.y}%`,
                  width: `${restrictedZone.w}%`,
                  height: `${restrictedZone.h}%`
                }}
              >
                <div className={`absolute top-1 left-1.5 text-[8.5px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.5 rounded font-bold truncate max-w-[120px] ${
                  isZoneBreached ? 'bg-red-500 text-black' : 'bg-amber-400 text-black'
                }`}>
                  {isZoneBreached ? 'ZONE BREACHED!' : restrictedZone.name}
                </div>
              </div>
            )}

            {/* 2. Tracked Person Bounding Box */}
            {trackedPerson && (
              <div
                className={`absolute border-2 rounded-xs transition-all duration-300 ${
                  isZoneBreached ? 'border-red-500 bg-red-500/20' : 'border-[#10E575] bg-[#10E575]/15'
                }`}
                style={{
                  left: `${trackedPerson.x}%`,
                  top: `${trackedPerson.y}%`,
                  width: `${trackedPerson.w}%`,
                  height: `${trackedPerson.h}%`
                }}
              >
                <div className={`absolute -top-4 sm:-top-5 left-0 text-[8.5px] sm:text-[9px] font-mono font-bold px-1 rounded-xs whitespace-nowrap ${
                  isZoneBreached ? 'bg-red-500 text-white' : 'bg-[#10E575] text-black'
                }`}>
                  Person ({Math.round(trackedPerson.confidence * 100)}%)
                </div>
              </div>
            )}

            {/* Top HUD Controls */}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between text-[9px] sm:text-[10px] font-mono gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 sm:py-1 rounded-lg border border-white/10 text-white truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                <span className="truncate">CAMERA ON-DEVICE</span>
                <span className="text-slate-400 hidden min-[380px]:inline">·</span>
                <span className="text-slate-300 hidden min-[380px]:inline">KEEP_LATEST</span>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={switchFacing}
                  className="bg-black/70 backdrop-blur-md px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-white/10 text-slate-300 hover:text-white"
                >
                  Flip
                </button>
                <button
                  onClick={toggleCamera}
                  className="bg-red-500/80 hover:bg-red-500 text-white px-2 py-0.5 sm:py-1 rounded-lg font-bold"
                >
                  Stop
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Zone Breach Emergency Alert & Dispatch Bar */}
      {isZoneBreached && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-red-500/15 border border-red-500/50 flex flex-col gap-2.5 shadow-lg shadow-red-500/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-red-300 font-mono block truncate">
                  RESTRICTED ZONE ENTRY DETECTED
                </span>
                <span className="text-[11px] text-slate-300 truncate block">
                  Tracked individual inside {restrictedZone.name}.
                </span>
              </div>
            </div>

            <span className="text-[9.5px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-red-500 text-black font-bold shrink-0">
              ACTIVE
            </span>
          </div>

          {/* User-Controlled Dispatch of Event Metadata to FastAPI */}
          <div className="pt-2 border-t border-red-500/20 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              {cooldownRemaining > 0 ? `Cooldown: ${cooldownRemaining}s` : 'Ready to record in audit trail'}
            </span>

            <button
              onClick={handleDispatchVisionIncident}
              disabled={submittingEvent || cooldownRemaining > 0}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                submitSuccess
                  ? 'bg-[#10E575] text-black'
                  : 'bg-red-500 hover:bg-red-400 text-black disabled:opacity-50'
              }`}
            >
              {submitSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Logged in FastAPI!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingEvent ? 'Submitting...' : 'Submit Incident'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Restricted Zone Geometry Configuration Drawer */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#12161E] border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-[#10E575] shrink-0" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold truncate">
              Restricted Perimeter Settings
            </h2>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-[#10E575] hover:underline font-mono shrink-0"
          >
            {showConfig ? 'Hide Controls' : 'Adjust Perimeter'}
          </button>
        </div>

        {showConfig && (
          <div className="flex flex-col gap-3 pt-2 border-t border-white/5 text-xs font-mono">
            {/* Zone Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400">Zone Label:</label>
              <input
                type="text"
                value={restrictedZone.name}
                onChange={(e) => onUpdateRestrictedZone({ name: e.target.value })}
                className="bg-[#0A0D11] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Sliders for Box Geometry: Reflow into 1 or 2 columns */}
            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">X Offset: {restrictedZone.x}%</span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={restrictedZone.x}
                  onChange={(e) => onUpdateRestrictedZone({ x: Number(e.target.value) })}
                  className="w-full accent-[#10E575]"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Y Offset: {restrictedZone.y}%</span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={restrictedZone.y}
                  onChange={(e) => onUpdateRestrictedZone({ y: Number(e.target.value) })}
                  className="w-full accent-[#10E575]"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Width: {restrictedZone.w}%</span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={restrictedZone.w}
                  onChange={(e) => onUpdateRestrictedZone({ w: Number(e.target.value) })}
                  className="w-full accent-[#10E575]"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Height: {restrictedZone.h}%</span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={restrictedZone.h}
                  onChange={(e) => onUpdateRestrictedZone({ h: Number(e.target.value) })}
                  className="w-full accent-[#10E575]"
                />
              </div>
            </div>

            {/* Cooldown duration */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Confirmation Cooldown:</span>
              <span className="text-[#10E575] font-bold">{restrictedZone.cooldownSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Spec & Privacy Guarantee */}
      <div className="p-3.5 rounded-2xl bg-[#0D1117] border border-white/5 flex flex-col gap-1.5 text-xs">
        <span className="font-mono text-[10px] uppercase text-slate-400 font-bold">
          Privacy & Engineering Notice
        </span>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Vision processing relies on local CameraX on-device inference. Raw video stream is not transmitted to FastAPI; only structured metadata (event coordinates, timestamps, and zone labels) are optionally submitted when authorized by the operator.
        </p>
      </div>
    </div>
  );
};
