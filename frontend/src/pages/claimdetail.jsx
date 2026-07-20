import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  Ban,
  CircleDashed,
  UploadCloud,
  Eye,
  Pencil,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useToast } from "../context/toastcontext.jsx";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import {
  deriveStages,
  deriveRequirements,
  requirementsSummary,
} from "../lib/claimProgress.js";
import categoryFields from "../data/categoryFields.json";
import CategoryIcon from "../components/categoryicon.jsx";
import { Sheet, SheetContent, SheetTitle } from "../components/ui/sheet.jsx";

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
  const { addToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Locally-staged uploads (demo): keyed by requirement key.
  const [staged, setStaged] = useState({});

  const claim = latestMap[id];

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
  // Fold locally-staged docs into the checklist so the drawer feels live.
  const effectiveReqs = requirements.map((r) =>
    staged[r.key] ? { ...r, state: "done", detail: `${staged[r.key]} (staged)` } : r,
  );
  const summary = requirementsSummary(effectiveReqs);

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

  const stageUpload = (key) => {
    setStaged((prev) => ({ ...prev, [key]: "Document" }));
    addToast({
      variant: "success",
      title: "Document staged",
      message: "Demo only — wiring to storage happens on submit.",
    });
  };

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
        <div className="claim-detail-actions">
          <button className="btn-secondary" onClick={() => setDrawerOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            <span>Upload documents</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT — claim info */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="workspace-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <CategoryIcon category={claim.type} size={42} />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">
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
              {claim.bank && <InfoRow label="Bank account" value={claim.bank} />}
            </dl>

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
          <div className="workspace-card p-5">
            <h2 className="panel-subtitle mb-4">Claim process</h2>
            <StageTracker stages={stages} />

            <h3 className="text-[11px] uppercase tracking-[0.07em] font-semibold text-text-tertiary mt-5 mb-2">
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
          <div className="workspace-card p-5">
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
              {effectiveReqs.map((r) => {
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
                    {r.canUpload && !staged[r.key] && (
                      <button
                        className="req-upload"
                        onClick={() => setDrawerOpen(true)}
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload
                      </button>
                    )}
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
                        ? "Meets every auto-approval check"
                        : policy.outcome === "block"
                        ? "Blocked by policy"
                        : "Routed for review"}
                    </strong>
                    <span className="preflight-rule">{policy.ruleId}</span>
                  </div>
                  <p className="preflight-message">{policy.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* right-side upload drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[26rem] p-0 flex flex-col">
          <div className="px-5 h-14 flex items-center border-b border-border-subtle">
            <SheetTitle className="font-semibold text-[0.95rem]">
              Upload documents
            </SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            <p className="text-[13px] text-text-secondary">
              Attach the documents this claim still needs. Each appears against the
              checklist as soon as it's added.
            </p>
            {effectiveReqs
              .filter((r) => r.canUpload || staged[r.key] || r.state === "missing")
              .map((r) => (
                <div key={r.key} className="drawer-doc">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{r.label}</div>
                    <div className="text-[11px] text-text-tertiary">{r.detail}</div>
                  </div>
                  {staged[r.key] ? (
                    <span className="drawer-doc-done">
                      <Check className="h-3.5 w-3.5" /> Added
                    </span>
                  ) : (
                    <label className="drawer-doc-upload">
                      <UploadCloud className="h-3.5 w-3.5" />
                      Choose file
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={() => stageUpload(r.key)}
                      />
                    </label>
                  )}
                </div>
              ))}
            {effectiveReqs.filter((r) => r.canUpload || staged[r.key] || r.state === "missing").length === 0 && (
              <div className="text-center text-sm text-text-tertiary py-8">
                <Check className="h-6 w-6 mx-auto mb-2 text-success" />
                Nothing outstanding — all documents are in.
              </div>
            )}
          </div>
          <div className="border-t border-border-subtle p-4 flex justify-end">
            <button className="btn-primary px-4" onClick={() => setDrawerOpen(false)}>
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
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
