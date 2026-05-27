export default function EmptyState({ variant = "documents", title, message }) {
  return (
    <div className="empty-state">
      <EmptyGraphic variant={variant} />
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-text">{message}</p>
    </div>
  );
}

function EmptyGraphic({ variant }) {
  if (variant === "queue") {
    return (
      <svg
        width="120"
        height="100"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="empty-graphic"
      >
        <circle cx="60" cy="50" r="42" fill="#eef7ff" />
        <rect x="36" y="22" width="44" height="54" rx="4" fill="white" stroke="#d2d2d7" strokeWidth="1.4" transform="rotate(-8 58 49)" />
        <rect x="40" y="20" width="44" height="54" rx="4" fill="white" stroke="#d2d2d7" strokeWidth="1.4" />
        <rect x="48" y="32" width="28" height="2.4" rx="1.2" fill="#d2d2d7" />
        <rect x="48" y="40" width="20" height="2.4" rx="1.2" fill="#d2d2d7" />
        <rect x="48" y="50" width="24" height="2.4" rx="1.2" fill="#d2d2d7" />
        <circle cx="76" cy="62" r="6" fill="#34c759" />
        <path d="M73 62 L75 64 L79 60" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="35" r="3" fill="#0a84ff" />
        <circle cx="100" cy="28" r="2" fill="#ff9500" />
        <circle cx="106" cy="68" r="2.5" fill="#5856d6" />
      </svg>
    );
  }

  if (variant === "audit") {
    return (
      <svg
        width="120"
        height="100"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="empty-graphic"
      >
        <circle cx="60" cy="50" r="42" fill="#eef7ff" />
        <rect x="32" y="22" width="52" height="48" rx="4" fill="white" stroke="#d2d2d7" strokeWidth="1.4" />
        <rect x="38" y="32" width="22" height="2.4" rx="1.2" fill="#d2d2d7" />
        <rect x="38" y="40" width="34" height="2.4" rx="1.2" fill="#d2d2d7" />
        <rect x="38" y="48" width="28" height="2.4" rx="1.2" fill="#d2d2d7" />
        <rect x="38" y="56" width="18" height="2.4" rx="1.2" fill="#d2d2d7" />
        <circle cx="80" cy="68" r="14" fill="white" stroke="#0a84ff" strokeWidth="2.2" />
        <line x1="90" y1="78" x2="98" y2="86" stroke="#0a84ff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="100" cy="30" r="2.5" fill="#ff9500" />
        <circle cx="18" cy="40" r="3" fill="#34c759" />
      </svg>
    );
  }

  // default: documents / claims
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="empty-graphic"
    >
      <circle cx="60" cy="50" r="42" fill="#eef7ff" />
      <rect x="38" y="20" width="44" height="56" rx="4" fill="white" stroke="#d2d2d7" strokeWidth="1.4" transform="rotate(-6 60 48)" />
      <rect x="40" y="22" width="44" height="56" rx="4" fill="white" stroke="#d2d2d7" strokeWidth="1.4" />
      <rect x="48" y="34" width="28" height="2.4" rx="1.2" fill="#d2d2d7" />
      <rect x="48" y="42" width="20" height="2.4" rx="1.2" fill="#d2d2d7" />
      <rect x="48" y="50" width="24" height="2.4" rx="1.2" fill="#d2d2d7" />
      <rect x="48" y="60" width="14" height="2.4" rx="1.2" fill="#d2d2d7" />
      <circle cx="82" cy="28" r="9" fill="#0a84ff" />
      <path d="M82 23 L82 33 M77 28 L87 28" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22" cy="38" r="3" fill="#34c759" />
      <circle cx="98" cy="68" r="2.5" fill="#ff9500" />
    </svg>
  );
}
