"use client";

import React from "react";

export function ClaimFlowLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cf-c1" x1="2" y1="16" x2="22" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="cf-c2" x1="10" y1="16" x2="30" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      {/* Primary Claim Circle (Indigo) */}
      <circle cx="12" cy="16" r="10" fill="url(#cf-c1)" />
      {/* Flow Circle (Sky/Emerald) overlapping with opacity for visual blend */}
      <circle cx="20" cy="16" r="10" fill="url(#cf-c2)" fillOpacity="0.85" />
      {/* Verification Checkmark centered in the intersection */}
      <path d="M13.5 15.5L15.5 17.5L19.5 13.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GrabLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7C7.5 7 9.5 9 12 11.5C14.5 14 16.5 16 20 16" stroke="#00B14F" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 11C7.5 11 9.5 13 12 15.5C14.5 18 16.5 20 20 20" stroke="#00B14F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PayNowLogo({ className = "h-4 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10C6 6.5 9 4 13 4C17 4 19.5 6.5 19.5 10C19.5 13.5 17 16 13 16C9 16 6 13.5 6 10Z" stroke="url(#pn-grad)" strokeWidth="3" fill="none" />
      <path d="M10.5 10C10.5 8 12 6.5 14.5 6.5C17 6.5 18.5 8 18.5 10C18.5 12 17 13.5 14.5 13.5C12 13.5 10.5 12 10.5 10Z" stroke="url(#pn-grad)" strokeWidth="2" fill="none" />
      <defs>
        <linearGradient id="pn-grad" x1="6" y1="4" x2="19.5" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C27B0" />
          <stop offset="0.5" stopColor="#E91E63" />
          <stop offset="1" stopColor="#FF9800" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DBSLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#FF0000" />
      <path d="M12 2V22" stroke="white" strokeWidth="2" />
      <path d="M2 12H22" stroke="white" strokeWidth="2" />
      <path d="M12 6.5L17.5 12L12 17.5L6.5 12Z" fill="white" />
    </svg>
  );
}

export function CitiLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Citi Red Arc */}
      <path 
        d="M 4 12 C 10 4, 22 4, 28 12" 
        stroke="#FF3333" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* "citi" text */}
      <text 
        x="16" 
        y="17" 
        fill="#005B94" 
        fontSize="11" 
        fontWeight="900" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        textAnchor="middle"
        letterSpacing="-0.5px"
      >
        citi
      </text>
    </svg>
  );
}
