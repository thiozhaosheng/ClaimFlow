export default function Logo({ size = 32, variant = "filled", className = "" }) {
  const isMonogram = variant === "monogram";
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ClaimFlow"
      className={className}
    >
      {!isMonogram && (
        <defs>
          {/* The mark is the source of the brand colour, so it reads the same
              tokens the UI does rather than hardcoding hexes. That also means
              it lightens on dark backgrounds instead of staying indigo-600
              against near-black. */}
          <linearGradient id="cfPrimary" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand)" />
            <stop offset="1" stopColor="var(--brand-2)" />
          </linearGradient>
          <linearGradient id="cfSecondary" x1="0" y1="50" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--brand-2)" stopOpacity="0.4" />
          </linearGradient>
          <filter id="cfGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="6"
              floodOpacity="0.25"
              style={{ floodColor: "var(--brand)" }}
            />
          </filter>
        </defs>
      )}
      
      <g filter={!isMonogram ? "url(#cfGlow)" : undefined}>
        {/* Top Isometric Diamond representing a document/receipt */}
        <path 
          d="M50 18 L82 36 L50 54 L18 36 Z" 
          fill={isMonogram ? "currentColor" : "url(#cfPrimary)"} 
        />
        {/* Middle Layer representing the flow/process */}
        <path 
          d="M18 50 L50 68 L82 50" 
          stroke={isMonogram ? "currentColor" : "url(#cfSecondary)"} 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Bottom Layer representing the final approval/payout */}
        <path 
          d="M18 66 L50 84 L82 66" 
          stroke={isMonogram ? "currentColor" : "url(#cfSecondary)"} 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </g>
    </svg>
  );
}
