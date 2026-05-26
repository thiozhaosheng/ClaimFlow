const LIFECYCLE = [
  { key: "submitted", label: "Submitted", icon: "fa-paper-plane" },
  { key: "pending", label: "Pending Review", icon: "fa-hourglass-half" },
  { key: "endorsed", label: "Endorsed", icon: "fa-circle-check" },
  { key: "reimbursed", label: "Reimbursed", icon: "fa-wallet" },
];

export default function WelcomeStrip({ title, subtitle, activeStage }) {
  return (
    <div className="welcome-strip">
      <div className="welcome-strip-text">
        <h2 className="welcome-strip-title">{title}</h2>
        <p className="welcome-strip-subtitle">{subtitle}</p>
      </div>

      <div className="lifecycle-flow" aria-label="Claim lifecycle">
        {LIFECYCLE.map((step, idx) => (
          <span key={step.key} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <span
              className={`lifecycle-step ${activeStage === step.key ? "active" : ""}`}
            >
              <i className={`fa-solid ${step.icon}`}></i>
              {step.label}
            </span>
            {idx < LIFECYCLE.length - 1 && (
              <i className="fa-solid fa-chevron-right lifecycle-arrow"></i>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
