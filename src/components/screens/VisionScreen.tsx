import React, { useState } from 'react';
import { AiDetection } from '../../types/safeplant';
import { 
  Eye, 
  Camera, 
  Scan, 
  ShieldCheck, 
  Crosshair, 
  Zap, 
  Maximize, 
  Flame, 
  Layers,
  Thermometer,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

import factoryFloorImg from '../../assets/images/vision_factory_floor_1792527750801.jpg';
import thermalBoilerImg from '../../assets/images/vision_thermal_zone_1792527751403.jpg';

interface VisionScreenProps {
  detections: AiDetection[];
  onTriggerInference?: () => void;
}

export const VisionScreen: React.FC<VisionScreenProps> = ({ detections, onTriggerInference }) => {
  const [activeCamera, setActiveCamera] = useState<'optical' | 'thermal'>('optical');
  const [showOverlays, setShowOverlays] = useState(true);

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">AI Vision Telemetry</h1>
          <p className="text-xs text-slate-400">Computer Vision & Thermal Infrared Stream</p>
        </div>

        {/* Live FPS Badge */}
        <div className="flex items-center gap-1.5 bg-[#12161E] px-2.5 py-1 rounded-full border border-white/5 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#10E575] animate-pulse" />
          <span className="text-slate-300">24.2 FPS</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">32ms</span>
        </div>
      </div>

      {/* Camera Selection Switcher */}
      <div className="flex items-center gap-2 p-1 bg-[#121721] rounded-xl border border-white/5">
        <button
          onClick={() => setActiveCamera('optical')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeCamera === 'optical'
              ? 'bg-[#1F2937] text-white shadow font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-[#10E575]" />
          <span>Cam 01 · Factory Floor</span>
        </button>

        <button
          onClick={() => setActiveCamera('thermal')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeCamera === 'thermal'
              ? 'bg-[#1F2937] text-white shadow font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span>Cam 04 · Thermal Radiometric</span>
        </button>
      </div>

      {/* Main Viewport Container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        {/* Stream Image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={activeCamera === 'optical' ? factoryFloorImg : thermalBoilerImg}
            alt={activeCamera === 'optical' ? 'Factory Floor AI Optical Stream' : 'Thermal Steam Flange Camera'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {/* Crosshair / HUD Overlays */}
          {showOverlays && (
            <>
              {/* Corner Grid Crosshairs */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#10E575]/80 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#10E575]/80 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#10E575]/80 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#10E575]/80 pointer-events-none" />

              {/* Optical Detection Boxes */}
              {activeCamera === 'optical' && (
                <>
                  {/* Worker 1 PPE Box */}
                  <div
                    className="absolute border-2 border-[#10E575] bg-[#10E575]/15 rounded-xs"
                    style={{ left: '14%', top: '60%', width: '10%', height: '26%' }}
                  >
                    <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold bg-[#10E575] text-black px-1 rounded-xs whitespace-nowrap">
                      PPE 98.4%
                    </span>
                  </div>

                  {/* Worker 2 PPE Box */}
                  <div
                    className="absolute border-2 border-[#10E575] bg-[#10E575]/15 rounded-xs"
                    style={{ left: '75%', top: '69%', width: '9%', height: '24%' }}
                  >
                    <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold bg-[#10E575] text-black px-1 rounded-xs whitespace-nowrap">
                      PPE 96.7%
                    </span>
                  </div>

                  {/* Automated Arm Zone Boundary */}
                  <div
                    className="absolute border border-dashed border-amber-400/60 bg-amber-400/5"
                    style={{ left: '26%', top: '35%', width: '48%', height: '36%' }}
                  >
                    <span className="absolute top-1 left-2 text-[9px] font-mono text-amber-300 bg-black/60 px-1 rounded">
                      ZONE 04: ROBOTICS CELL · CLEAR
                    </span>
                  </div>
                </>
              )}

              {/* Thermal Reticle */}
              {activeCamera === 'thermal' && (
                <div
                  className="absolute border border-white/80 rounded-full w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                  style={{ left: '50%', top: '50%' }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="absolute -bottom-5 text-[10px] font-mono font-bold text-white bg-black/80 px-1 rounded">
                    MAX 195.0°C
                  </span>
                </div>
              )}
            </>
          )}

          {/* Top Camera Metadata Strip */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>LIVE</span>
              <span className="text-slate-400">·</span>
              <span>RTSP://192.168.1.180/CH01</span>
            </div>

            <button
              onClick={() => setShowOverlays(!showOverlays)}
              className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-slate-300 hover:text-white border border-white/10"
            >
              HUD: {showOverlays ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Viewport Lower Telemetry Bar */}
        <div className="p-3 bg-[#0E131A] border-t border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-[#10E575]" />
            <span className="text-slate-300">SafePlant-YOLOv8x-Industrial</span>
          </div>
          <span className="text-[#10E575] font-semibold">Zero Infractions</span>
        </div>
      </div>

      {/* Detection Registry Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Active Vision Detections ({detections.length})
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Confidence &gt; 95%</span>
        </div>

        <div className="flex flex-col gap-2">
          {detections.map((det) => (
            <div
              key={det.id}
              className="p-3 rounded-xl bg-[#11161F] border border-white/5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10E575]/15 text-[#10E575] flex items-center justify-center shrink-0">
                  {det.type === 'ppe' ? (
                    <UserCheck className="w-4 h-4" />
                  ) : det.type === 'thermal' ? (
                    <Thermometer className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {det.label}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>{det.zone}</span>
                    <span>·</span>
                    <span>{(det.confidence * 100).toFixed(1)}% Confidence</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-[#10E575] bg-[#10E575]/10 px-2 py-0.5 rounded border border-[#10E575]/20">
                  COMPLIANT
                </span>
                <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                  {det.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
