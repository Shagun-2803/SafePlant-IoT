import React from 'react';

interface SafePlantLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export const SafePlantLogo: React.FC<SafePlantLogoProps> = ({
  size = 36,
  className = '',
  showWordmark = true,
}) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 select-none min-w-0 ${className}`}>
      {/* Emblem SVG: Shield + Leaf + Industrial Circuit Motif */}
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(16,229,117,0.25)]"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E2732" />
              <stop offset="0.6" stopColor="#121820" />
              <stop offset="1" stopColor="#0B0F14" />
            </linearGradient>

            <linearGradient id="shieldBorder" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10E575" stopOpacity="0.8" />
              <stop offset="0.5" stopColor="#2D3A4B" />
              <stop offset="1" stopColor="#10E575" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="leafGrad" x1="16" y1="12" x2="32" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#25F285" />
              <stop offset="0.6" stopColor="#10E575" />
              <stop offset="1" stopColor="#059648" />
            </linearGradient>
          </defs>

          {/* Outer Industrial Shield with Chamfered Corners */}
          <path
            d="M24 4L39 9.5V23C39 32.5 32.8 40.8 24 44C15.2 40.8 9 32.5 9 23V9.5L24 4Z"
            fill="url(#shieldGrad)"
            stroke="url(#shieldBorder)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Industrial Geometric Stepped Inset */}
          <path
            d="M24 8L35 12.5V22C35 29.5 30.2 36.2 24 39C17.8 36.2 13 29.5 13 22V12.5L24 8Z"
            stroke="#1C2633"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Stylized SafePlant Leaf combined with Industrial Circuit/Pipeline */}
          <path
            d="M24 13C24 13 32 17.5 31.5 26.5C31 31.5 27 34 24 34.5C21 34 17 31.5 16.5 26.5C16 17.5 24 13 24 13Z"
            fill="url(#leafGrad)"
          />

          {/* Central Circuit/Pipeline Spine */}
          <path
            d="M24 15V32"
            stroke="#082A16"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          {/* Industrial Branch Telemetry Lines */}
          <path
            d="M24 21L28 19"
            stroke="#082A16"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M24 25L20 23"
            stroke="#082A16"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M24 28L27.5 27"
            stroke="#082A16"
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          {/* Core Telemetry Node Pulse */}
          <circle cx="24" cy="32" r="1.5" fill="#FFFFFF" />
          <circle cx="24" cy="15" r="1" fill="#FFFFFF" />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-none min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[15px] sm:text-[17px] font-bold tracking-tight text-white font-sans truncate">
              Safe<span className="text-[#10E575]">Plant</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-[#10E575]/15 text-[#10E575] border border-[#10E575]/30 shrink-0">
              AIoT
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9.5px] font-mono tracking-wider text-slate-400 uppercase mt-0.5 hidden min-[360px]:block truncate">
            Industrial Safety System
          </span>
        </div>
      )}
    </div>
  );
};
