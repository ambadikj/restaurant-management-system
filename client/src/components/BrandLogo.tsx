import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

/**
 * Minimal, sleek, and professional brand emblem for Serve_Sync.
 * Combines an architectural dining cloche dome with synchronized fluid 'S' curves.
 */
export function BrandLogo({ className = "h-5 w-5", size = 20 }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="brand-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FA2D48" />
          <stop offset="1" stopColor="#FF4D6D" />
        </linearGradient>
      </defs>

      {/* Sleek Cloche Service Arc / Synced Upper Curve */}
      <path
        d="M4 14C4 9.58172 7.58172 6 12 6C16.4183 6 20 9.58172 20 14"
        stroke="url(#brand-grad)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Modern Minimal Platter Line with Rounded Terminals */}
      <path
        d="M3 18H21"
        stroke="url(#brand-grad)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Top Precision Sync Node */}
      <circle cx="12" cy="3.5" r="1.5" fill="#FA2D48" />

      {/* Center Subtle Dynamic Sync Pulse Dot */}
      <circle cx="12" cy="11.5" r="1.25" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

export function BrandCrest({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#1f1f23] to-[#141416] border border-white/[0.12] shadow-md shadow-black/40 ${className}`}
    >
      <BrandLogo size={18} />
    </div>
  );
}
