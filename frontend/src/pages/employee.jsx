import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  FlaskConical,
  Info,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import { api } from "../utils/api.js";
import policies from "../data/policies.json";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import EditClaimModal from "../components/editclaimmodal.jsx";
import PolicyFlag from "../components/policyflag.jsx";
import CategoryFields, {
  missingRequiredCategoryFields,
} from "../components/categoryfields.jsx";

const DISALLOWED_CATEGORIES = (() => {
  const rule = policies.rules.find((r) => r.id === "block-disallowed-category");
  return rule?.when?.[0]?.value ?? [];
})();

const CATEGORY_OPTIONS = [
  { value: "Transport", label: "Transport (Grab / Taxi / MRT)" },
  { value: "Meal", label: "Meal" },
  { value: "Client Entertainment", label: "Client Entertainment" },
  { value: "Office Supplies", label: "Office Supplies" },
  { value: "Travel", label: "Overseas Travel" },
  { value: "Training", label: "Training" },
  { value: "Medical (statutory)", label: "Medical — statutory (WICA, etc.)" },
  { value: "Medical (non-statutory)", label: "Medical — non-statutory", disallowed: true },
  { value: "Club Subscription", label: "Club Subscription", disallowed: true },
  { value: "Family Benefit", label: "Family Benefit", disallowed: true },
  { value: "Motor Car (non-commercial)", label: "Motor Car — non-commercial", disallowed: true },
];

const RECEIPT_REQUIRED_OVER = 50;
const FULL_TAX_INVOICE_OVER = 1000;
const MAX_AGE_DAYS = 90;

const DEMO_RECEIPTS = [
  {
    label: "Small Grab — auto-approves",
    href: "/test-receipts/grab-transport.pdf",
    ext: "PDF",
    expect: "Transport · S$19.10 · auto-endorsed",
  },
  {
    label: "Hawker meal — auto-approves",
    href: "/test-receipts/hawker-meal.pdf",
    ext: "PDF",
    expect: "Meal · S$8.70 · auto-endorsed",
  },
  {
    label: "Office supplies — routes to approver",
    href: "/test-receipts/office-supplies.pdf",
    ext: "PDF",
    expect: "Office Supplies · S$177.00 · pending review",
  },
  {
    label: "Client dinner — over S$500 ceiling",
    href: "/test-receipts/client-dinner.pdf",
    ext: "PDF",
    expect: "Client Entertainment · S$657.80 · pending review with hint",
  },
  {
    label: "Hawker meal (JPEG)",
    href: "/test-receipts/hawker-meal.jpg",
    ext: "JPG",
    expect: "Tiny fixture to test JPEG upload path",
  },
  {
    label: "Grab transport (PNG)",
    href: "/test-receipts/grab-transport.png",
    ext: "PNG",
    expect: "Tiny fixture to test PNG upload path",
  },
  {
    label: "Oversized file (~11 MB)",
    href: "/test-receipts/oversized.pdf",
    ext: "PDF",
    expect: "Rejected by the 10 MB upload limit",
  },
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
  const [activeClaim, setActiveClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const [details, setDetails] = useState({});
  const fileInputRef = useRef(null);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const categoryDisallowed = DISALLOWED_CATEGORIES.includes(category);
  const receiptRequired = numericAmount > RECEIPT_REQUIRED_OVER;
  const receiptMissing = receiptRequired && !hasFile;
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

  const formHasMinFields = title.trim() && date && numericAmount > 0;

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

      // Best-effort prefill of per-category details from what OCR extracted.
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
      }
      if (data.source === "unavailable") {
        addToast({
          variant: "warning",
          title: "Couldn't read this receipt",
          message:
            "The image was uploaded but the parser couldn't extract details. Please fill in the fields manually.",
        });
      } else {
        addToast({
          variant: "info",
          title:
            data.source === "azure"
              ? "Receipt analysed"
              : "Receipt parsed (demo data)",
          message: "Review the extracted details and confirm before submitting.",
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
        message: `Receipt image required for claims above ${formatSGD(RECEIPT_REQUIRED_OVER)}.`,
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
      const suppressed = policy?.autoApproveSuppressedByOcr;
      const autoApproved =
        policy?.outcome === "auto-approve" && !suppressed;
      addToast({
        variant: suppressed ? "warning" : autoApproved ? "success" : "info",
        title: suppressed
          ? "Submitted — pending manual review"
          : autoApproved
          ? "Auto-endorsed"
          : "Claim submitted",
        message: created
          ? suppressed
            ? `${created.id} would have auto-approved, but OCR couldn't verify the receipt — your approver will double-check.`
            : autoApproved
            ? `${created.id} (${created.type} · ${formatSGD(created.amount)}) was auto-endorsed by policy. Awaiting payout.`
            : `${created.id} (${created.type} · ${formatSGD(created.amount)}) is now pending review.`
          : "Your claim is now pending review.",
      });
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
      setDetails({});
      setCategoryTouched(false);
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
  const distinctClaims = allClaims.slice(0, 5);

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

  return (
    <section id="view-employee" className="role-workspace">
      <PageHeader
        eyebrow="Employee"
        title="Submit & track your claims"
        subtitle="Snap a receipt — we extract the merchant, amount, GST and date so you only confirm. Claims under S$50 in standard categories auto-approve; anything larger routes to a manager."
        actions={
          <div
            className="flex items-center gap-4 px-3 h-9 rounded-ds-sm border border-border-subtle bg-card text-[12px] text-text-secondary tabular-nums"
            aria-label="Your claims pipeline"
          >
            <span>
              <b className="font-semibold text-text-primary">
                {stats.submittedThisMonth}
              </b>{" "}
              submitted
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-warning-text">{stats.pending}</b>{" "}
              pending
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-accent">{stats.endorsed}</b>{" "}
              endorsed
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-success-text">
                {stats.paidThisMonthCount}
              </b>{" "}
              paid
            </span>
          </div>
        }
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8">
          <div className="workspace-card p-5">
            <h2 className="workspace-card-title mb-3 flex items-center gap-2">
              <span className="plus-icon-badge">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              Submit new claim
            </h2>

            <form onSubmit={handleSubmit}>
              {extracted && extracted.source !== "unavailable" && (
                <div className="extracted-banner" role="status">
                  <div className="extracted-banner-icon">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="extracted-banner-text">
                    <strong>
                      {extracted.source === "azure"
                        ? "Receipt analysed"
                        : "Receipt parsed (demo data)"}
                    </strong>
                    <span>
                      We pre-filled the form below. Review each field and adjust
                      anything that looks off before submitting.
                    </span>
                  </div>
                </div>
              )}
              {extracted && extracted.source === "unavailable" && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-sm bg-warning-bg text-warning-text border border-border-subtle" role="alert">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>OCR couldn't read this receipt.</strong>
                    <div className="text-xs mt-1">
                      The image is stored against your claim — please fill in the fields
                      manually. Common causes: PDF over 4 MB, encrypted PDF, very small
                      screenshot, or a layout the model doesn't recognise.
                    </div>
                  </div>
                </div>
              )}

              {categoryDisallowed && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-sm bg-danger-bg text-danger-text border border-border-subtle" role="alert">
                  <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>This category cannot be claimed.</strong>
                    <div className="text-xs mt-1">
                      {policies.rules.find((r) => r.id === "block-disallowed-category")?.message}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      Rule: <code>block-disallowed-category</code> — see{" "}
                      <Link to="/policies">approval policy</Link>.
                    </div>
                  </div>
                </div>
              )}

              {fullTaxInvoiceRequired && !categoryDisallowed && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="form-label">Claim Title</label>
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
                  <label className="form-label">Merchant</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Grab, NTUC FairPrice, Toast Box"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="form-label">Expense Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    min={minDate}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <div className="mt-1 text-xs text-text-tertiary">
                    Claims must be within the last {MAX_AGE_DAYS} days. Future dates are not accepted.
                  </div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select
                    className={`form-select ${categoryDisallowed ? "border-danger" : ""}`}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setCategoryTouched(true);
                    }}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                        {opt.disallowed ? " — not claimable" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <CategoryFields
                category={category}
                details={details}
                onChange={setDetails}
              />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                <div className="md:col-span-7">
                  <label className="form-label">Total amount (incl. GST)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-card border-r-0 text-text-secondary">
                      S$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control border-l-0 pl-1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-5">
                  <label className="form-label">
                    GST (9%) <span className="form-label-hint">optional</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-card border-r-0 text-text-secondary">
                      S$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control border-l-0 pl-1"
                      placeholder="0.00"
                      value={gstAmount}
                      onChange={(e) => setGstAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Receipt{" "}
                  {receiptRequired ? (
                    <span className="text-danger text-xs">required for this amount</span>
                  ) : (
                    <span className="form-label-hint">we auto-fill the form from this</span>
                  )}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className={`file-dropzone block w-full ${isDragOver ? "dragover" : ""} ${parsing ? "parsing" : ""} ${
                    receiptMissing ? "!border-danger" : ""
                  }`}
                  onClick={() => !parsing && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-label={fileName ? `Receipt ${fileName} attached. Click to replace.` : "Upload receipt"}
                  disabled={parsing}
                >
                  <div className="flex justify-center mb-2">
                    {parsing ? (
                      <Loader2 className="h-6 w-6 text-text-tertiary animate-spin" />
                    ) : (
                      <UploadCloud className="h-6 w-6 text-text-tertiary" strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="m-0 text-sm">
                    {parsing ? (
                      "Reading your receipt…"
                    ) : fileName ? (
                      <>
                        <span className="text-accent font-medium">
                          {escapeHtml(fileName)}
                        </span>{" "}
                        attached
                      </>
                    ) : (
                      "Drop a receipt here or click to browse"
                    )}
                  </p>
                  <span className="dropzone-subtext">
                    Photos, Grab / PayNow / SimplyGo screenshots. JPG, PNG, PDF up to 10&nbsp;MB.
                  </span>
                </button>
                {receiptMissing && (
                  <div className="text-danger-text text-xs mt-2 flex items-start gap-1.5">
                    <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      A receipt is required for claims above {formatSGD(RECEIPT_REQUIRED_OVER)}.
                      Rule: <code>block-missing-receipt-over-threshold</code>.
                    </span>
                  </div>
                )}
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

              {/* compliance preflight */}
              {formHasMinFields && (
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
                          "Will auto-approve on submit"}
                        {preflight.outcome === "route-to-human" &&
                          "Goes to your approving officer"}
                        {preflight.outcome === "block" &&
                          "Won't submit — policy blocks this"}
                      </strong>
                      <span className="preflight-rule">{preflight.ruleId}</span>
                    </div>
                    <p className="preflight-message">{preflight.message}</p>
                    {preflight.outcome === "block" && (
                      <p className="preflight-hint">
                        Fix the issue above or see{" "}
                        <Link to="/policies">the company approval policy</Link>{" "}
                        for the full rule list.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-2 font-medium"
                disabled={submitting || formInvalid}
              >
                {submitting ? "Submitting…" : "Submit claim"}
              </button>

              <p className="text-xs text-text-tertiary mt-3 mb-0 text-center">
                By submitting, you confirm the claim is accurate and consent to the{" "}
                <Link to="/privacy">Privacy notice</Link> and the{" "}
                <Link to="/policies">Approval policy</Link>.
              </p>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="workspace-card p-5 h-full">
            {/* compact at-a-glance stats */}
            <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-border-subtle">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Submitted
                </span>
                <span className="text-lg font-bold tabular-nums leading-tight">
                  {stats.submittedThisMonth}
                </span>
                <span className="text-[10px] text-text-secondary">
                  this month
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  In flight
                </span>
                <span className="text-lg font-bold tabular-nums leading-tight">
                  {stats.inFlight}
                </span>
                <span className="text-[10px] text-text-secondary">
                  {stats.pending}P · {stats.endorsed}E
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Paid
                </span>
                <span className="text-lg font-bold tabular-nums text-success-text leading-tight">
                  {formatSGD(stats.paidThisMonth).replace("S$", "")}
                </span>
                <span className="text-[10px] text-text-secondary">
                  this month
                </span>
              </div>
            </div>

            <details className="mb-3 group">
              <summary className="cursor-pointer text-[11px] font-medium text-text-tertiary hover:text-text-primary inline-flex items-center gap-1.5 select-none">
                <FlaskConical className="h-3 w-3" />
                Demo fixtures · {DEMO_RECEIPTS.length} test receipts
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-[11px]">
                {DEMO_RECEIPTS.map((r) => (
                  <li
                    key={r.href}
                    className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-ds-sm border border-border-subtle bg-subtle/40"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={r.href}
                        download
                        className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent"
                      >
                        <Download className="h-2.5 w-2.5" />
                        {r.label}
                      </a>
                      <p className="text-text-tertiary mt-0.5 truncate">
                        {r.expect}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-text-tertiary border border-border-subtle px-1 py-0.5 rounded">
                      {r.ext}
                    </span>
                  </li>
                ))}
              </ul>
            </details>

            <h3 className="panel-subtitle mb-3 text-sm">Recent claims</h3>
            <div className="flex flex-col gap-3">
              {distinctClaims.length === 0 ? (
                <EmptyState
                  variant="documents"
                  title="No claims yet"
                  message="Submitted claims will appear here once you upload a receipt."
                />
              ) : (
                distinctClaims.map((item) => (
                  <div
                    key={item.id}
                    className={`claim-mini-card clickable ${item.status.toLowerCase()}`}
                  >
                    <div
                      className="flex justify-between items-start gap-2 cursor-pointer"
                      onClick={() => setActiveClaim(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setActiveClaim(item);
                      }}
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-text-primary m-0 text-sm mb-1">
                          {escapeHtml(item.type)} Claim
                        </h4>
                        <span className="text-text-secondary block text-xs">{item.date}</span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`badge-custom badge-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                        <span className="block font-bold text-text-primary text-sm">
                          {formatSGD(item.amount)}
                        </span>
                        <PolicyFlag claim={item} variant="chip" />
                      </div>
                    </div>
                    {item.status === "Pending" && (
                      <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClaim(item);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-ds-sm text-[11px] font-medium text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
                          title="Edit claim details"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (
                              !window.confirm(
                                "Withdraw this claim? It won't be visible to approvers but stays archived in case of disputes.",
                              )
                            )
                              return;
                            try {
                              await withdrawClaim(item.id);
                              addToast({
                                variant: "info",
                                title: "Claim withdrawn",
                                message: `${item.id} has been withdrawn from review.`,
                              });
                            } catch (err) {
                              addToast({
                                variant: "error",
                                title: "Couldn't withdraw",
                                message: err?.message || "Try again in a moment.",
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-ds-sm text-[11px] font-medium text-danger-text hover:bg-danger-bg transition-colors"
                          title="Withdraw claim"
                        >
                          <Trash2 className="h-3 w-3" />
                          Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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
          try {
            await editClaim(editingClaim.id, updates);
            addToast({
              variant: "success",
              title: "Claim updated",
              message: `${editingClaim.id} saved — still pending review.`,
            });
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
