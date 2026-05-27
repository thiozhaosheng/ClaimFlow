export default function Logo({ size = 32, variant = "filled" }) {
  const gradientId = `cf-logo-grad-${variant}`;

  const background =
    variant === "monogram" ? (
      <rect width="32" height="32" rx="9" fill="currentColor" />
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
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      </>
    );

  const lineFill = variant === "monogram" ? "currentColor" : "#0058b0";

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
      {/* subtle inner ring for depth */}
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        fill="none"
        stroke="white"
        strokeOpacity={variant === "monogram" ? "0.18" : "0.12"}
        strokeWidth="1"
      />
      {/* single receipt body */}
      <rect x="9" y="6" width="14" height="20" rx="2.2" fill="white" />
      {/* two thin content lines */}
      <rect
        x="11.5"
        y="9.5"
        width="9"
        height="1"
        rx="0.5"
        fill={lineFill}
        fillOpacity="0.55"
      />
      <rect
        x="11.5"
        y="11.5"
        width="6"
        height="1"
        rx="0.5"
        fill={lineFill}
        fillOpacity="0.35"
      />
      {/* clean check mark in the lower receipt area */}
      <path
        d="M 11.5 19 L 14.5 22 L 20.5 15"
        stroke="#34c759"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
