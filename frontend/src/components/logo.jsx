export default function Logo({ size = 32, variant = "filled" }) {
  const gradientId = `cf-logo-grad-${variant}`;

  const background =
    variant === "monogram" ? (
      <rect width="32" height="32" rx="8" fill="currentColor" />
    ) : (
      <>
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#0058b0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      </>
    );

  const receiptLineFill = variant === "monogram" ? "currentColor" : "#0058b0";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ClaimFlow"
    >
      {background}
      {/* back receipt (stacked) */}
      <rect
        x="9.5"
        y="6.5"
        width="13"
        height="16"
        rx="2.4"
        fill="white"
        fillOpacity="0.35"
      />
      {/* front receipt */}
      <rect x="7" y="8.5" width="13" height="16" rx="2.4" fill="white" />
      {/* receipt rows */}
      <rect x="9.5" y="12" width="8" height="1.3" rx="0.65" fill={receiptLineFill} fillOpacity="0.85" />
      <rect x="9.5" y="14.8" width="5.5" height="1.3" rx="0.65" fill={receiptLineFill} fillOpacity="0.55" />
      <rect x="9.5" y="17.6" width="7" height="1.3" rx="0.65" fill={receiptLineFill} fillOpacity="0.55" />
      {/* approval check badge */}
      <circle cx="22.5" cy="22.5" r="5.2" fill="#34c759" />
      <path
        d="M20 22.6 L21.8 24.4 L25 20.9"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
