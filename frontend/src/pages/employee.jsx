import { Fragment, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import { api } from "../utils/api.js";
import policies from "../data/policies.json";
import categoryFieldSpecs from "../data/categoryFields.json";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import EditClaimModal, {
  correctionRequestOf,
} from "../components/editclaimmodal.jsx";
import ConfirmModal from "../components/confirmmodal.jsx";
import PolicyFlag from "../components/policyflag.jsx";
import CategoryFields, {
  missingRequiredCategoryFields,
} from "../components/categoryfields.jsx";
import {
  OcrSourceBadge,
  OcrFieldTag,
  OcrProgress,
} from "../components/ocrfeedback.jsx";
import {
  extractedFieldKeys,
  isLiveOcr,
  OCR_FIELD_LABELS,
} from "../lib/ocr.js";
import CategoryIcon from "../components/categoryicon.jsx";
import "./employee-wizard.css";

export const DISALLOWED_CATEGORIES = (() => {
  const rule = policies.rules.find((r) => r.id === "block-disallowed-category");
  return rule?.when?.[0]?.value ?? [];
})();

// Only categories the policy allows are offered. Categories the policy blocks
// outright (Medical non-statutory, Club Subscription, Family Benefit, Motor
// Car) are deliberately NOT listed — nobody should be able to pick a category
// that can never be claimed. See DISALLOWED_CATEGORIES / the
// block-disallowed-category rule for the blocked list.
const CATEGORY_OPTIONS = [
  { value: "Transport", label: "Transport (Grab / Taxi / MRT)" },
  { value: "Meal", label: "Meal" },
  { value: "Client Entertainment", label: "Client Entertainment" },
  { value: "Office Supplies", label: "Office Supplies" },
  { value: "Travel", label: "Overseas Travel" },
  { value: "Training", label: "Training" },
  { value: "Medical (statutory)", label: "Medical — statutory (WICA, etc.)" },
];

const FULL_TAX_INVOICE_OVER = 1000;
const MAX_AGE_DAYS = 90;

const WIZARD_STEPS = [
  { key: "receipt", label: "Receipt" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Map an "HH:MM" transaction time to one of the CategoryFields travel-window
// options so OCR can prefill Transport.travelWindow from receipt timestamps.
function travelWindowFromTime(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = hhmm.match(/^(\d{1,2}):/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (Number.isNaN(h)) return null;
  if (h >= 6 && h < 12) return "Morning (06-12)";
  if (h >= 12 && h < 18) return "Afternoon (12-18)";
  if (h >= 18 && h < 22) return "Evening (18-22)";
  return "Late night (22-06)";
}

// Build a per-category `details` prefill from whatever OCR extracted. Only
// fields with confident OCR signals are populated — fields we can't extract
// (occasion, attendees, businessJustification, etc.) stay empty and the user
// fills them in. The caller merges this into the live `details` state but
// never overwrites values the user already typed.
function derivePerCategoryDetails(category, ocrData) {
  if (!ocrData) return null;
  const { merchant, items, route, transactionTime } = ocrData;

  switch (category) {
    case "Transport": {
      const out = {};
      if (route?.from) out.fromLocation = route.from;
      if (route?.to) out.toLocation = route.to;
      const window = travelWindowFromTime(transactionTime);
      if (window) out.travelWindow = window;
      return out;
    }
    case "Office Supplies": {
      if (!items || items.length === 0) return null;
      // First few line items, comma-joined, capped so the textarea stays sane.
      const summary = items.slice(0, 5).join(", ");
      return summary ? { itemSummary: summary } : null;
    }
    case "Travel": {
      const out = {};
      if (merchant) {
        const m = merchant.toLowerCase();
        if (/airline|airways|airasia|scoot|jetstar|sia/.test(m)) out.mode = "Flight";
        else if (/train|smrt|mrt|rail/.test(m)) out.mode = "Train";
      }
      return Object.keys(out).length > 0 ? out : null;
    }
    case "Training": {
      // Provider is the merchant on training receipts (Coursera, AWS Training,
      // SMU Academy, etc.).
      if (!merchant) return null;
      return { provider: merchant };
    }
    case "Medical (statutory)": {
      if (!merchant) return null;
      return { clinic: merchant };
    }
    default:
      return null;
  }
}

function minDateIso() {
  const d = new Date();
  d.setDate(d.getDate() - MAX_AGE_DAYS);
  return d.toISOString().slice(0, 10);
}

// Small badge for a field the receipt read could not fill — the counterpart
// of OcrFieldTag, so the user can see at a glance what still needs typing.
function ManualEntryTag() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.75rem] font-semibold bg-warning-bg text-warning-text border border-warning-border tracking-wide uppercase">
      Type this in
    </span>
  );
}

export default function Employee() {
  const { session } = useAuth();
  const {
    latestMap,
    submitClaim,
    claimsDb,
    error,
    editClaim,
    withdrawClaim,
  } = useClaims();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeClaim, setActiveClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  // The claim awaiting withdrawal confirmation, or null when the dialog is shut.
  const [withdrawingClaim, setWithdrawingClaim] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Which wizard step is showing: 0 receipt, 1 details, 2 review.
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Transport");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [amount, setAmount] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [fileName, setFileName] = useState("");
  const [hasFile, setHasFile] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [viewUrl, setViewUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [extracted, setExtracted] = useState(null);
  // Which fields were read from the receipt, so we can mark them and clear the
  // mark once the user overrides the value. Holds top-level keys (merchant,
  // amount, …) plus any per-category detail keys the read prefliled.
  const [ocrFields, setOcrFields] = useState(() => new Set());
  const [details, setDetails] = useState({});
  const fileInputRef = useRef(null);

  const ocrLive = isLiveOcr(extracted?.source);
  // Remove a field's "read from receipt" mark once the user edits it themselves.
  const clearOcrField = (key) =>
    setOcrFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const categoryDisallowed = DISALLOWED_CATEGORIES.includes(category);
  // Receipts are mandatory for ALL claims — step 1 gates on one being attached.
  const receiptMissing = !hasFile;
  const fullTaxInvoiceRequired = numericAmount > FULL_TAX_INVOICE_OVER;
  const missingDetailKeys = useMemo(
    () => missingRequiredCategoryFields(category, details),
    [category, details],
  );
  const detailsIncomplete = missingDetailKeys.length > 0;
  const formInvalid = categoryDisallowed || receiptMissing || detailsIncomplete;
  const today = todayIso();
  const minDate = minDateIso();

  // Reset per-category details when category changes so leftover Transport
  // fields don't end up persisted on a Meal claim.
  const lastCategoryRef = useRef(category);
  if (lastCategoryRef.current !== category) {
    lastCategoryRef.current = category;
    // safe to call during render — same-tick state update
    setDetails({});
  }

  // live policy preflight — runs as user fills the form
  const preflight = useMemo(() => {
    const ctx = claimContextFromForm({
      category,
      amount: numericAmount,
      expenseDate: date,
      hasFile,
      details,
    });
    return evaluatePolicies(ctx);
  }, [category, numericAmount, date, hasFile, details]);

  // Per-step gates for the Continue button.
  const stepOneValid = hasFile && !parsing;
  const stepTwoValid = Boolean(
    title.trim() &&
      date &&
      numericAmount > 0 &&
      !detailsIncomplete &&
      !categoryDisallowed,
  );

  const goToStep = (next) => {
    if (next === 1 && !stepOneValid) return;
    if (next === 2 && (!stepOneValid || !stepTwoValid)) return;
    setStep(next);
  };

  const resetForm = () => {
    setTitle("");
    setDate("");
    setCategory("Transport");
    setAmount("");
    setGstAmount("");
    setMerchant("");
    setFileName("");
    setHasFile(false);
    setReceiptUrl(null);
    setViewUrl(null);
    setExtracted(null);
    setOcrFields(new Set());
    setDetails({});
    setCategoryTouched(false);
    setStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setHasFile(true);
    setParsing(true);
    setExtracted(null);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const result = await api.postForm("/api/claims/parse-receipt", fd);
      const data = result?.data;
      if (!data) throw new Error("No data returned");
      if (data.total != null) setAmount(String(data.total));
      if (data.gstAmount != null) setGstAmount(String(data.gstAmount));
      if (data.merchant) setMerchant(data.merchant);
      if (data.expenseDate) setDate(data.expenseDate);
      // Only apply OCR's category guess if the user hasn't already picked
      // one themselves. Even a "confident" guess can be wrong (e.g. a
      // medical bill from "Raffles Medical Cafe" looks like Meal to OCR).
      if (
        !categoryTouched &&
        data.category &&
        CATEGORY_OPTIONS.find((o) => o.value === data.category)
      ) {
        setCategory(data.category);
      }
      if (data.merchant && !title) {
        setTitle(`${data.merchant} - ${data.category || "claim"}`);
      }
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);
      if (data.viewUrl) setViewUrl(data.viewUrl);
      setExtracted(data);
      // Mark exactly the fields the read populated. If the user already chose
      // a category, don't claim the receipt filled it.
      const filled = new Set(extractedFieldKeys(data));
      if (categoryTouched) filled.delete("category");

      // Best-effort prefill of per-category details from what was read.
      // Only fills empty keys — never overwrites something the user typed.
      const effectiveCategory =
        categoryTouched ? category : (data.category || category);
      const detailsPrefill = derivePerCategoryDetails(effectiveCategory, data);
      if (detailsPrefill) {
        setDetails((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(detailsPrefill)) {
            if (v === undefined || v === null || v === "") continue;
            if (next[k] === undefined || next[k] === null || next[k] === "") {
              next[k] = v;
            }
          }
          return next;
        });
        for (const [k, v] of Object.entries(detailsPrefill)) {
          if (v !== undefined && v !== null && v !== "") filled.add(k);
        }
      }
      setOcrFields(filled);
      if (data.source === "unavailable") {
        addToast({
          variant: "warning",
          title: "Couldn't read this receipt",
          message:
            "The image was uploaded but we couldn't read details from it. Please fill in the fields manually.",
        });
      } else if (data.source === "azure") {
        addToast({
          variant: "success",
          title: "Read by Azure Document Intelligence",
          message: "We pre-filled the form — review each field before submitting.",
        });
      } else {
        addToast({
          variant: "info",
          title: "Filled with demo data",
          message: "Your receipt wasn't read live — verify each field before submitting.",
        });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not read receipt",
        message: err?.message || "Try again or fill in the fields manually.",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Enter on an earlier step advances the wizard instead of submitting.
    if (step !== 2) {
      if (step === 0 && stepOneValid) setStep(1);
      else if (step === 1 && stepTwoValid) setStep(2);
      return;
    }
    if (!title || !date || !amount || submitting) return;
    if (categoryDisallowed) {
      const rule = policies.rules.find((r) => r.id === "block-disallowed-category");
      addToast({ variant: "error", title: "Category not allowed", message: rule?.message ?? "" });
      return;
    }
    if (receiptMissing) {
      addToast({
        variant: "error",
        title: "Receipt required",
        message: "A receipt image must be provided to submit a claim.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitClaim({
        title,
        date,
        category,
        amount: parseFloat(amount),
        gstAmount: gstAmount === "" ? null : parseFloat(gstAmount),
        merchant: merchant || null,
        receiptUrl,
        ocrSource: extracted?.source || null,
        details: Object.keys(details).length > 0 ? details : null,
        email: session?.email || "",
      });
      const created = result?.claim;
      const policy = result?.policy;
      const withheld = policy?.recommendationWithheldByOcr;
      const recommended = policy?.recommendation === "approve";
      addToast({
        variant: withheld ? "warning" : recommended ? "success" : "info",
        title: withheld
          ? "Submitted — receipt needs a manual check"
          : recommended
          ? "Submitted, marked ready to approve"
          : "Claim submitted",
        message: created
          ? withheld
            ? `${created.id} is within policy, but the receipt didn't scan cleanly — your approver will check the details you typed.`
            : recommended
            ? `${created.id} (${created.type} · ${formatSGD(created.amount)}) is within policy. Your approver just has to verify and approve.`
            : `${created.id} (${created.type} · ${formatSGD(created.amount)}) is with your approver for review.`
          : "Your claim is with your approver for review.",
      });
      resetForm();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not submit claim",
        message: err?.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) parseFile(files[0]);
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  const allClaims = Object.values(latestMap);
  // A claim an approver has sent back is the one thing on this page that is
  // waiting on the employee, so it leads the list ahead of ordinary pending
  // claims. sort() is stable, so everything else keeps the API's order.
  const distinctClaims = [...allClaims]
    .sort(
      (a, b) =>
        (correctionRequestOf(b) ? 1 : 0) - (correctionRequestOf(a) ? 1 : 0),
    )
    // Eight, not four: the list is a table inside a panel that scrolls its own
    // body now, so rows no longer decide whether the page clears the fold.
    // This is still "Recent claims", not the archive.
    .slice(0, 8);

  // The references waiting on the employee, named once above the table so the
  // work is visible even when the panel is scrolled down.
  const claimsNeedingFix = distinctClaims.filter((c) => correctionRequestOf(c));

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      return (
        dt.getMonth() === now.getMonth() &&
        dt.getFullYear() === now.getFullYear()
      );
    };
    return {
      submittedThisMonth: allClaims.filter((c) => thisMonth(c.date)).length,
      pending: allClaims.filter((c) => c.status === "Pending").length,
      endorsed: allClaims.filter((c) => c.status === "Endorsed").length,
      inFlight: allClaims.filter(
        (c) => c.status === "Pending" || c.status === "Endorsed",
      ).length,
      paidThisMonth: allClaims
        .filter((c) => c.status === "Paid" && thisMonth(c.date))
        .reduce((s, c) => s + c.amount, 0),
      paidThisMonthCount: allClaims.filter(
        (c) => c.status === "Paid" && thisMonth(c.date),
      ).length,
    };
  }, [allClaims]);

  // Which of the base fields the receipt read filled, in display order — used
  // for the step-2 summary line ("Read from your receipt: merchant, amount…").
  const readFieldLabels = useMemo(() => {
    const order = ["merchant", "expenseDate", "category", "amount", "gstAmount"];
    return order
      .filter((k) => ocrFields.has(k))
      .map((k) => OCR_FIELD_LABELS[k].toLowerCase());
  }, [ocrFields]);

  // Per-category detail rows for the review summary, using the same labels
  // the details step shows.
  const detailRows = useMemo(() => {
    const fields = categoryFieldSpecs[category]?.fields || [];
    return fields
      .filter((f) => {
        const v = details?.[f.key];
        return v !== undefined && v !== null && v !== "";
      })
      .map((f) => ({ key: f.key, label: f.label, value: String(details[f.key]) }));
  }, [category, details]);

  // Shows "Type this in" next to a base field the receipt read didn't fill.
  // Only once a receipt has been processed — before that, nothing was read
  // by definition and the tags would be noise.
  const needsInput = (key, value) =>
    extracted && !ocrFields.has(key) && !value;

  return (
    <section id="view-employee" className="role-workspace">
      <PageHeader
        eyebrow="Employee"
        title="Submit & track your claims"
        subtitle="Attach a receipt, confirm the details read from it, and follow each claim through your approver."
      />

      {error && (
        <div className="data-error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Could not load claims</strong>
            <span>{error.message}</span>
          </div>
        </div>
      )}

      {/* One ruled band of figures — the same band the approval queue reads
          from, so the two workspaces are visibly one product. */}
      <div className="metric-strip mb-4">
        <div className="metric-item">
          <span className="metric-item-label">Submitted</span>
          <span className="metric-item-value">{stats.submittedThisMonth}</span>
          <span className="metric-item-sub">claims this month</span>
        </div>
        <div className="metric-item">
          <span className="metric-item-label">In flight</span>
          <span className="metric-item-value">{stats.inFlight}</span>
          <span className="metric-item-sub">
            {stats.pending} pending · {stats.endorsed} endorsed
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-item-label">Paid</span>
          <span className="metric-item-value">
            {formatSGD(stats.paidThisMonth).replace("S$", "")}
          </span>
          <span className="metric-item-sub">SGD this month</span>
        </div>
      </div>

      {/* Two columns, not one stacked column. A form and a ledger want
          different widths: stretched to the same ~1180px the dropzone became
          a giant empty box with its label floating mid-air and Continue ended
          up far from the sentence it follows, while the ledger below showed a
          single row. Side by side each gets the width it wants. */}
      <div className="employee-band">
      <form onSubmit={handleSubmit} className="data-panel submit-panel">
        <div className="data-panel-head">
          <span className="data-panel-title">Submit new claim</span>
          {/* Quiet text step indicator — completed steps are clickable. */}
          <ol className="wizard-steps" aria-label="Claim submission steps">
            {WIZARD_STEPS.map((s, i) => (
              <li key={s.key}>
                {i < step ? (
                  <button
                    type="button"
                    className="wizard-step wizard-step-done"
                    onClick={() => setStep(i)}
                  >
                    {s.label}
                  </button>
                ) : (
                  <span
                    className={`wizard-step ${
                      i === step ? "wizard-step-current" : "wizard-step-upcoming"
                    }`}
                    aria-current={i === step ? "step" : undefined}
                  >
                    {s.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="submit-panel-body">
          {/* File input lives outside the panels so an attached file
              survives step changes. */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />

          {step === 0 && (
            <div className="wizard-panel">
              <p className="wizard-intro">
                Start with your receipt — we read the merchant, amount, GST
                and date from it, so the next step is mostly confirming.
              </p>

              <button
                type="button"
                className={`file-dropzone block w-full ${isDragOver ? "dragover" : ""} ${parsing ? "parsing" : ""}`}
                onClick={() => !parsing && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-label={fileName ? `Receipt ${fileName} attached. Click to replace.` : "Upload receipt"}
                disabled={parsing}
              >
                {parsing ? (
                  <OcrProgress />
                ) : (
                  <>
                    <div className="flex justify-center mb-2">
                      <UploadCloud className="h-6 w-6 text-text-tertiary" strokeWidth={1.5} />
                    </div>
                    <p className="m-0 text-sm">
                      {fileName ? (
                        <>
                          <span className="text-accent font-medium">
                            {escapeHtml(fileName)}
                          </span>{" "}
                          attached — click to replace
                        </>
                      ) : (
                        "Drop a receipt here or click to browse"
                      )}
                    </p>
                    <span className="dropzone-subtext">
                      Photos, Grab / PayNow / SimplyGo screenshots. JPG, PNG, PDF up to 10&nbsp;MB.
                    </span>
                  </>
                )}
              </button>

              {receiptMissing && !parsing && (
                <div className="text-text-tertiary text-[0.8125rem] mt-2 flex items-start gap-1.5">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Every claim needs a receipt before it can be submitted.
                    Rule: <code>block-missing-receipt</code>.
                  </span>
                </div>
              )}

              {extracted && <div className="mt-3"><OcrSourceBadge source={extracted.source} /></div>}

              {viewUrl && (
                <div className="text-success-text text-xs mt-2 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Receipt stored.{" "}
                    <a href={viewUrl} target="_blank" rel="noreferrer" className="underline">
                      View uploaded image
                    </a>{" "}
                    <span className="text-text-tertiary">(link valid 15 minutes)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="wizard-panel">
              {extracted && (
                <p className="wizard-read-note">
                  {readFieldLabels.length > 0 ? (
                    <>
                      Read from your receipt: {readFieldLabels.join(", ")}.
                      Tagged fields below came from the receipt — check
                      them, then fill in the rest yourself.
                    </>
                  ) : (
                    <>
                      We couldn't read details from this receipt. It's
                      attached to the claim — please type each field below.
                    </>
                  )}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="form-label">
                    Claim Title
                    {needsInput("title", title) && <ManualEntryTag />}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Grab to client meeting"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    Merchant
                    {ocrFields.has("merchant") && <OcrFieldTag live={ocrLive} />}
                    {needsInput("merchant", merchant) && <ManualEntryTag />}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Grab, NTUC FairPrice, Toast Box"
                    value={merchant}
                    onChange={(e) => {
                      setMerchant(e.target.value);
                      clearOcrField("merchant");
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="form-label">
                    Expense Date
                    {ocrFields.has("expenseDate") && <OcrFieldTag live={ocrLive} />}
                    {needsInput("expenseDate", date) && <ManualEntryTag />}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    min={minDate}
                    max={today}
                    onChange={(e) => {
                      setDate(e.target.value);
                      clearOcrField("expenseDate");
                    }}
                    required
                  />
                  <div className="mt-1 text-xs text-text-tertiary">
                    Claims must be within the last {MAX_AGE_DAYS} days. Future dates are not accepted.
                  </div>
                </div>
                <div>
                  <label className="form-label">
                    Category
                    {ocrFields.has("category") && <OcrFieldTag live={ocrLive} />}
                  </label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setCategoryTouched(true);
                      clearOcrField("category");
                    }}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-text-tertiary">
                    Only categories the{" "}
                    <Link to="/policies">approval policy</Link> allows are
                    listed.
                  </div>
                </div>
              </div>

              <CategoryFields
                category={category}
                details={details}
                onChange={setDetails}
                ocrFields={ocrFields}
                ocrLive={ocrLive}
                clearError={clearOcrField}
              />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-1">
                <div className="md:col-span-7">
                  <label className="form-label">
                    Total amount (incl. GST)
                    {ocrFields.has("amount") && <OcrFieldTag live={ocrLive} />}
                    {needsInput("amount", amount) && <ManualEntryTag />}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-card border-r-0 text-text-secondary">
                      S$
                    </span>
                    <input
                      type="number"
                      // A currency field should open the keypad, not the
                      // alphabetic keyboard. "decimal" keeps the separator key,
                      // which "numeric" omits.
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="form-control border-l-0 pl-1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        clearOcrField("amount");
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-5">
                  <label className="form-label">
                    GST (9%) <span className="form-label-hint">optional</span>
                    {ocrFields.has("gstAmount") && <OcrFieldTag live={ocrLive} />}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-card border-r-0 text-text-secondary">
                      S$
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="form-control border-l-0 pl-1"
                      placeholder="0.00"
                      value={gstAmount}
                      onChange={(e) => {
                        setGstAmount(e.target.value);
                        clearOcrField("gstAmount");
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-panel">
              <div className="wizard-review-head">
                <p className="wizard-intro m-0">
                  Check everything reads right, then submit.
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="wizard-review-edit"
                    onClick={() => setStep(0)}
                  >
                    Change receipt
                  </button>
                  <button
                    type="button"
                    className="wizard-review-edit"
                    onClick={() => setStep(1)}
                  >
                    Edit details
                  </button>
                </div>
              </div>

              <dl className="wizard-review">
                <div className="wizard-review-row">
                  <dt>Receipt</dt>
                  <dd>
                    {escapeHtml(fileName)}
                    {viewUrl && (
                      <>
                        {" "}
                        <a href={viewUrl} target="_blank" rel="noreferrer" className="underline">
                          view
                        </a>
                      </>
                    )}
                  </dd>
                </div>
                <div className="wizard-review-row">
                  <dt>Title</dt>
                  <dd>{escapeHtml(title)}</dd>
                </div>
                <div className="wizard-review-row">
                  <dt>Merchant</dt>
                  <dd>{merchant ? escapeHtml(merchant) : "—"}</dd>
                </div>
                <div className="wizard-review-row">
                  <dt>Date</dt>
                  <dd>{date}</dd>
                </div>
                <div className="wizard-review-row">
                  <dt>Category</dt>
                  <dd>{category}</dd>
                </div>
                {detailRows.map((row) => (
                  <div className="wizard-review-row" key={row.key}>
                    <dt>{row.label}</dt>
                    <dd>{escapeHtml(row.value)}</dd>
                  </div>
                ))}
                <div className="wizard-review-row wizard-review-money">
                  <dt>Amount (incl. GST)</dt>
                  <dd>{formatSGD(numericAmount)}</dd>
                </div>
                <div className="wizard-review-row wizard-review-money">
                  <dt>GST</dt>
                  <dd>
                    {gstAmount !== "" && Number.isFinite(parseFloat(gstAmount))
                      ? formatSGD(parseFloat(gstAmount))
                      : "—"}
                  </dd>
                </div>
              </dl>

              {fullTaxInvoiceRequired && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-sm bg-warning-bg text-warning-text border border-border-subtle" role="alert">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Full tax invoice required.</strong>
                    <div className="text-xs mt-1">
                      Claims above {formatSGD(FULL_TAX_INVOICE_OVER)} need the supplier's GST
                      registration number and tax invoice serial number per IRAS rules. Please
                      attach the full tax invoice as your receipt — finance will verify the fields
                      before approval.
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      Rule: <code>route-tax-invoice-required</code> — see{" "}
                      <Link to="/policies">approval policy</Link>.
                    </div>
                  </div>
                </div>
              )}

              {/* compliance preflight — the policy engine recommends, a
                  human approver always decides */}
              <div
                className={`preflight preflight-${preflight.outcome}`}
                role="status"
                aria-live="polite"
              >
                <div className="preflight-icon">
                  {preflight.outcome === "auto-approve" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : preflight.outcome === "block" ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="preflight-body">
                  <div className="preflight-headline">
                    <strong>
                      {preflight.outcome === "auto-approve" &&
                        "Within policy — will be marked ready to approve"}
                      {preflight.outcome === "route-to-human" &&
                        "Goes to your approving officer"}
                      {preflight.outcome === "block" &&
                        "Won't submit — policy blocks this"}
                    </strong>
                    {/* The recommend rules are named auto-approve-* in
                        policies.json; surfacing that id would contradict
                        the advisory copy ("the engine recommends, a human
                        decides"), so the chip is shown only for routing
                        and block outcomes. */}
                    {preflight.outcome !== "auto-approve" && (
                      <span className="preflight-rule">{preflight.ruleId}</span>
                    )}
                  </div>
                  <p className="preflight-message">{preflight.message}</p>
                  {preflight.outcome === "auto-approve" && (
                    <p className="preflight-hint">
                      Your approver still gives the final decision.
                    </p>
                  )}
                  {preflight.outcome === "block" && (
                    <p className="preflight-hint">
                      Fix the issue above or see{" "}
                      <Link to="/policies">the company approval policy</Link>{" "}
                      for the full rule list.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="wizard-footer">
            {step > 0 ? (
              <button
                type="button"
                className="btn-secondary wizard-back"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {step < 2 ? (
              // Distinct keys matter here: without them React reuses the
              // same <button> DOM node for Continue and Submit, and the
              // click that advances to Review re-types the node to
              // "submit" before the browser runs the click's default
              // action — submitting the form in the same click.
              <button
                key="wizard-continue"
                type="button"
                className="btn-primary wizard-continue"
                disabled={step === 0 ? !stepOneValid : !stepTwoValid}
                onClick={() => goToStep(step + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                key="wizard-submit"
                type="submit"
                className="btn-primary wizard-continue"
                disabled={submitting || formInvalid}
              >
                {submitting ? "Submitting…" : "Submit claim"}
              </button>
            )}
          </div>

          {step === 2 && (
            <p className="text-xs text-text-tertiary mt-3 mb-0 text-center">
              By submitting, you confirm the claim is accurate and consent to the{" "}
              <Link to="/privacy">Privacy notice</Link> and the{" "}
              <Link to="/policies">Approval policy</Link>.
            </p>
          )}
        </div>
      </form>

      {/* Recent claims as a ledger, not a stack of cards. The columns an
          employee compares — reference, category, amount, where it sits — line
          up on shared axes, the same table the approver reads their queue in.
          The panel body scrolls on its own so the page keeps the fold. */}
      <div className="data-panel claims-panel">
        <div className="data-panel-head">
          <span className="data-panel-title">Recent claims</span>
          <span className="claims-panel-count">
            {distinctClaims.length === allClaims.length
              ? `${allClaims.length} claims`
              : `${distinctClaims.length} of ${allClaims.length} claims`}
          </span>
        </div>

        {/* Named above the table as well as on the row: a correction is the
            one thing here that is waiting on the employee, and the panel body
            scrolls, so the reference has to be readable without scrolling. */}
        {claimsNeedingFix.length > 0 && (
          <div className="claims-fix-banner" role="status">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Waiting on you:{" "}
              {claimsNeedingFix.map((c, i) => (
                <Fragment key={c.id}>
                  {i > 0 && ", "}
                  <span className="data-ref">{c.id}</span>
                </Fragment>
              ))}
              {" — "}
              {claimsNeedingFix.length === 1
                ? "your approver asked for a correction before this can be approved."
                : "your approver asked for corrections before these can be approved."}
            </span>
          </div>
        )}

        {distinctClaims.length === 0 ? (
          <div className="claims-panel-empty">
            <EmptyState
              variant="documents"
              title="No claims yet"
              message="Submitted claims will appear here once you upload a receipt."
            />
          </div>
        ) : (
          <div className="data-panel-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {distinctClaims.map((item) => {
                  const fix = correctionRequestOf(item);
                  const open = () => navigate(`/claim/${item.id}`);
                  return (
                    <Fragment key={item.id}>
                      <tr
                        className={fix ? "claim-row-fix" : undefined}
                        role="button"
                        tabIndex={0}
                        aria-label={`${item.type} claim ${item.id}, ${item.date}, ${formatSGD(item.amount)}, ${fix ? "correction requested" : item.status}`}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            open();
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <td data-label="Reference">
                          <span className="data-ref">{item.id}</span>
                          <span className="claim-row-date">{item.date}</span>
                        </td>
                        <td data-label="Category">
                          <span className="claim-row-cat">
                            <CategoryIcon category={item.type} size={18} />
                            {escapeHtml(item.type)}
                          </span>
                        </td>
                        <td className="num" data-label="Amount">
                          <span className="claim-row-total">
                            {formatSGD(item.amount)}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className="claim-row-status">
                            {fix ? (
                              <span className="claim-chip claim-chip-fix">
                                Correction requested
                              </span>
                            ) : (
                              <span
                                className={`badge-custom badge-${item.status.toLowerCase()}`}
                              >
                                {item.status}
                              </span>
                            )}
                            {!fix && (
                              <PolicyFlag
                                claim={item}
                                variant="chip"
                                hideAutoApproved
                                className="policy-flag-chip"
                              />
                            )}
                          </span>
                        </td>
                        {/* Quiet text actions, right-aligned with the numbers.
                            Colour on a per-row button would put four coloured
                            controls on a ledger and mean nothing. */}
                        <td
                          className="num claim-row-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {fix ? (
                            <button
                              type="button"
                              className="row-action row-action-fix"
                              onClick={() => setEditingClaim(item)}
                            >
                              Fix and resend
                            </button>
                          ) : (
                            item.status === "Pending" && (
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => setEditingClaim(item)}
                                title="Edit claim details"
                              >
                                Edit
                              </button>
                            )
                          )}
                          {item.status === "Pending" && (
                            <button
                              type="button"
                              className="row-action row-action-danger"
                              onClick={() => setWithdrawingClaim(item)}
                              title="Withdraw claim"
                            >
                              Withdraw
                            </button>
                          )}
                        </td>
                      </tr>
                      {fix && (
                        // The approver named the exact fields; a row that only
                        // said "does not match" would leave the chase where it
                        // was. The note keeps its own line under the row.
                        <tr className="claim-row-fix-note">
                          <td colSpan={5}>
                            <div className="fix-request">
                              <ul className="fix-fields">
                                {fix.labels.map((label) => (
                                  <li className="fix-field" key={label}>
                                    {label}
                                  </li>
                                ))}
                              </ul>
                              <p className="fix-note">
                                <span className="fix-who">
                                  {escapeHtml(fix.requestedBy)}
                                </span>
                                {fix.note
                                  ? `: ${escapeHtml(fix.note)}`
                                  : " checked your receipt and these do not match."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      <ConfirmModal
        open={!!withdrawingClaim}
        title="Withdraw this claim?"
        message="It won't be visible to approvers any more, but stays archived in case of disputes."
        confirmLabel="Withdraw claim"
        cancelLabel="Keep claim"
        destructive
        onCancel={() => setWithdrawingClaim(null)}
        onConfirm={async () => {
          const claim = withdrawingClaim;
          setWithdrawingClaim(null);
          try {
            await withdrawClaim(claim.id);
            addToast({
              variant: "info",
              title: "Claim withdrawn",
              message: `${claim.id} has been withdrawn from review.`,
            });
          } catch (err) {
            addToast({
              variant: "error",
              title: "Couldn't withdraw",
              message: err?.message || "Try again in a moment.",
            });
          }
        }}
      />

      <ClaimDetailModal
        open={!!activeClaim}
        claim={activeClaim}
        history={
          activeClaim
            ? claimsDb.filter((log) => log.id === activeClaim.id)
            : []
        }
        onClose={() => setActiveClaim(null)}
      />

      <EditClaimModal
        open={!!editingClaim}
        claim={editingClaim}
        onSave={async (updates) => {
          // Saving a claim that was sent back closes the loop on the backend:
          // the request is cleared and the approver is notified. The toast has
          // to say that, otherwise "saved" leaves the user wondering whether
          // they still need to message anyone.
          const fix = correctionRequestOf(editingClaim);
          try {
            await editClaim(editingClaim.id, updates);
            addToast(
              fix
                ? {
                    variant: "success",
                    title: "Sent back for approval",
                    message: `${editingClaim.id} is back with ${fix.requestedBy}, who will re-check ${fix.labels.join(", ")}. Nothing else to do.`,
                  }
                : {
                    variant: "success",
                    title: "Claim updated",
                    message: `${editingClaim.id} saved — still pending review.`,
                  },
            );
            setEditingClaim(null);
          } catch (err) {
            addToast({
              variant: "error",
              title: "Couldn't save",
              message: err?.message || "Try again.",
            });
          }
        }}
        onCancel={() => setEditingClaim(null)}
      />
    </section>
  );
}
