import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  Ban,
  CircleDashed,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useReceipt } from "../hooks/usereceipt.js";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import {
  deriveStages,
  deriveRequirements,
  requirementsSummary,
} from "../lib/claimProgress.js";
import categoryFields from "../data/categoryFields.json";
import CategoryIcon from "../components/categoryicon.jsx";

const STATUS_KEY = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
};

// Requirement state → semantic presentation (icon + tone). Color carries
// MEANING here: green=satisfied, amber=needs action, red=blocking, grey=neutral.
const REQ_PRESENTATION = {
  done: { icon: Check, tone: "done" },
  missing: { icon: AlertTriangle, tone: "warn" },
  blocked: { icon: Ban, tone: "block" },
  review: { icon: Clock, tone: "info" },
  optional: { icon: CircleDashed, tone: "muted" },
};

function StageTracker({ stages }) {
  return (
    <ol className="stage-tracker" aria-label="Claim progress">
      {stages.map((s, i) => (
        <li key={s.key} className={`stage-node stage-${s.state}`}>
          <span className="stage-dot">
            {s.state === "done" ? (
              <Check className="h-3 w-3" />
            ) : s.state === "rejected" ? (
              <Ban className="h-3 w-3" />
            ) : s.state === "current" ? (
              <Clock className="h-3 w-3" />
            ) : (
              <span className="stage-num">{i + 1}</span>
            )}
          </span>
          <span className="stage-label">{s.label}</span>
          {i < stages.length - 1 && <span className="stage-line" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { latestMap, claimsDb } = useClaims();

  const claim = latestMap[id];
  const {
    src: receiptSrc,
    broken: receiptBroken,
    markBroken: markReceiptBroken,
  } = useReceipt(claim);

  const history = useMemo(
    () => (claim ? claimsDb.filter((log) => log.id === claim.id) : []),
    [claim, claimsDb],
  );

  const policy = useMemo(() => {
    if (!claim) return null;
    return evaluatePolicies(
      claimContextFromForm({
        category: claim.type,
        amount: claim.amount,
        receiptUrl: claim.receiptUrl,
        expenseDate: claim.date,
        details: claim.details || {},
      }),
    );
  }, [claim]);

  const stages = useMemo(() => (claim ? deriveStages(claim) : []), [claim]);
  const requirements = useMemo(
    () => (claim ? deriveRequirements(claim) : []),
    [claim],
  );
  const summary = requirementsSummary(requirements);

  const categorySpec = claim ? categoryFields[claim.type] : null;
  const detailEntries =
    claim?.details && categorySpec?.fields
      ? categorySpec.fields
          .map((f) => ({ label: f.label, value: claim.details[f.key] }))
          .filter((e) => e.value !== undefined && e.value !== null && e.value !== "")
      : [];

  if (!claim) {
    return (
      <section className="role-workspace">
        <div className="workspace-card p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
          <h2 className="text-lg font-semibold mb-1">Claim not found</h2>
          <p className="text-sm text-text-secondary mb-4">
            We couldn't find claim <code>{id}</code> in your view.
          </p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </section>
    );
  }

  const statusKey = STATUS_KEY[claim.status] || "pending";


  return (
    <section className="role-workspace claim-detail">
      {/* header */}
      <div className="claim-detail-topbar">
        <button
          className="claim-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back to claims"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-[1.35rem] font-semibold tracking-tighter truncate">
            {claim.id}
          </h1>
          <span className={`badge-custom badge-${statusKey}`}>{claim.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT — claim info */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="workspace-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CategoryIcon category={claim.type} size={42} />
              <div className="min-w-0">
                <div className="text-[0.75rem] uppercase tracking-wider text-text-tertiary font-semibold">
                  {claim.type}
                </div>
                <div className="text-lg font-bold tabular-nums leading-tight">
                  {formatSGD(claim.amount)}
                </div>
              </div>
            </div>

            <dl className="claim-info-list">
              <InfoRow label="Claimant" value={claim.employee} />
              <InfoRow label="Department" value={claim.department} />
              <InfoRow label="Expense date" value={formatSGDate(claim.date)} />
              {claim.merchant && <InfoRow label="Merchant" value={claim.merchant} />}
              {claim.gstAmount != null && (
                <InfoRow label="GST" value={formatSGD(claim.gstAmount)} />
              )}
            </dl>

            {/* The receipt itself, not a claim that one exists. This page used
                to state "Attached." and stop, so the person who submitted the
                claim was the only one who could not look at it — the approver
                has had it in the review modal all along. */}
            {claim.receiptUrl && (
              <div className="claim-receipt-view">
                {receiptSrc && !receiptBroken ? (
                  <a href={receiptSrc} target="_blank" rel="noreferrer">
                    <img
                      src={receiptSrc}
                      alt={`Receipt for ${claim.id}`}
                      onError={markReceiptBroken}
                    />
                    <span>Open full size</span>
                  </a>
                ) : (
                  <p className="claim-receipt-missing">
                    Receipt stored, preview unavailable.
                  </p>
                )}
              </div>
            )}

            {detailEntries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <div className="text-[10px] uppercase tracking-[0.06em] text-text-tertiary font-semibold mb-2">
                  {categorySpec?.label || claim.type} details
                </div>
                <dl className="claim-info-list">
                  {detailEntries.map((e, i) => (
                    <InfoRow key={i} label={e.label} value={String(e.value)} />
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — process + requirements */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* status / process */}
          <div className="workspace-card p-6">
            <h2 className="panel-subtitle mb-4">Claim process</h2>
            <StageTracker stages={stages} />

            <h3 className="text-[0.75rem] uppercase tracking-[0.07em] font-semibold text-text-tertiary mt-5 mb-2">
              Activity
            </h3>
            {history.length === 0 ? (
              <p className="form-hint">No activity recorded yet.</p>
            ) : (
              <ol className="timeline">
                {history.map((entry, i) => {
                  const dotKey = STATUS_KEY[entry.status] || "pending";
                  return (
                    <li key={i} className="timeline-item">
                      <span className={`timeline-dot timeline-dot-${dotKey}`} />
                      <div className="timeline-content">
                        <div className="timeline-action">{entry.action}</div>
                        <div className="timeline-meta">
                          {entry.actor} · {entry.role} · {entry.date} {entry.time}
                        </div>
                        {entry.reason && (
                          <div className="text-[12px] text-text-secondary mt-1 italic">
                            {entry.reason}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* requirements checklist */}
          <div className="workspace-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="panel-subtitle">Documents &amp; requirements</h2>
              <span className={`req-summary req-summary-${summary}`}>
                {summary === "complete"
                  ? "All clear"
                  : summary === "missing"
                  ? "Action needed"
                  : summary === "blocked"
                  ? "Blocked"
                  : "Under review"}
              </span>
            </div>
            <ul className="req-list">
              {requirements.map((r) => {
                const pres = REQ_PRESENTATION[r.state] || REQ_PRESENTATION.optional;
                const Icon = pres.icon;
                return (
                  <li key={r.key} className={`req-row req-${pres.tone}`}>
                    <span className="req-icon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="req-body">
                      <div className="req-label">{r.label}</div>
                      {r.detail && <div className="req-detail">{r.detail}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {policy && (
              <div className={`preflight preflight-${policy.outcome} mt-4`} role="status">
                <div className="preflight-icon">
                  {policy.outcome === "auto-approve" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : policy.outcome === "block" ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="preflight-body">
                  <div className="preflight-headline">
                    <strong>
                      {policy.outcome === "auto-approve"
                        ? "Within policy on every check"
                        : policy.outcome === "block"
                        ? "Blocked by policy"
                        : "Routed for review"}
                    </strong>
                    {policy.label && (
                      <span className="preflight-rule">{policy.label}</span>
                    )}
                  </div>
                  <p className="preflight-message">{policy.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* right-side upload drawer */}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="claim-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
