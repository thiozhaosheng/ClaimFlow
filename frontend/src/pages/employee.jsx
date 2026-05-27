import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import { api } from "../utils/api.js";
import policies from "../data/policies.json";
import WelcomeStrip from "../components/welcomestrip.jsx";
import EmptyState from "../components/emptystate.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function minDateIso() {
  const d = new Date();
  d.setDate(d.getDate() - MAX_AGE_DAYS);
  return d.toISOString().slice(0, 10);
}

export default function Employee() {
  const { session } = useAuth();
  const { latestMap, submitClaim, claimsDb, error } = useClaims();
  const { addToast } = useToast();
  const [activeClaim, setActiveClaim] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Transport");
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
  const fileInputRef = useRef(null);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const categoryDisallowed = DISALLOWED_CATEGORIES.includes(category);
  const receiptRequired = numericAmount > RECEIPT_REQUIRED_OVER;
  const receiptMissing = receiptRequired && !hasFile;
  const fullTaxInvoiceRequired = numericAmount > FULL_TAX_INVOICE_OVER;
  const formInvalid = categoryDisallowed || receiptMissing;
  const today = todayIso();
  const minDate = minDateIso();

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
      if (data.category && CATEGORY_OPTIONS.find((o) => o.value === data.category)) {
        setCategory(data.category);
      }
      if (data.merchant && !title) {
        setTitle(`${data.merchant} - ${data.category || "claim"}`);
      }
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);
      if (data.viewUrl) setViewUrl(data.viewUrl);
      setExtracted(data);
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
      const created = await submitClaim({
        title,
        date,
        category,
        amount: parseFloat(amount),
        gstAmount: gstAmount === "" ? null : parseFloat(gstAmount),
        merchant: merchant || null,
        receiptUrl,
        email: session?.email || "",
      });
      addToast({
        variant: "success",
        title: "Claim submitted",
        message: created
          ? `${created.id} (${created.type} · ${formatSGD(created.amount)}) is now pending review.`
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

  const distinctClaims = Object.values(latestMap).slice(0, 5);

  return (
    <section id="view-employee" className="role-workspace">
      <WelcomeStrip
        title="Submit a new claim"
        subtitle="Upload your receipt and route it for approval — track every status in real time."
        activeStage="submitted"
      />

      {error && (
        <div className="data-error" role="alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>Could not load claims</strong>
            <span>{error.message}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="workspace-card p-6">
            <h2 className="workspace-card-title mb-4 flex items-center">
              <span className="plus-icon-badge mr-2">
                <i className="fa-solid fa-plus"></i>
              </span>
              Submit New Claim
            </h2>

            <form onSubmit={handleSubmit}>
              {extracted && extracted.source !== "unavailable" && (
                <div className="extracted-banner" role="status">
                  <div className="extracted-banner-icon">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
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
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-md bg-warning-bg text-warning-text border border-warning/20" role="alert">
                  <i className="fa-solid fa-circle-info mt-1"></i>
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
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-md bg-danger-bg text-danger-text border border-danger/20" role="alert">
                  <i className="fa-solid fa-ban mt-1"></i>
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
                <div className="flex items-start gap-2 p-3 mb-3 rounded-ds-md bg-warning-bg text-warning-text border border-warning/20" role="alert">
                  <i className="fa-solid fa-circle-exclamation mt-1"></i>
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

              <div className="mb-3">
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

              <div className="mb-3">
                <label className="form-label">Merchant</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Grab, NTUC FairPrice, Toast Box"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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
                    onChange={(e) => setCategory(e.target.value)}
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
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
                <div
                  className={`file-dropzone ${isDragOver ? "dragover" : ""} ${parsing ? "parsing" : ""} ${
                    receiptMissing ? "border border-danger" : ""
                  }`}
                  onClick={() => !parsing && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {parsing ? (
                    <i className="fa-solid fa-circle-notch fa-spin dropzone-icon mb-2"></i>
                  ) : (
                    <i className="fa-solid fa-cloud-arrow-up dropzone-icon mb-2"></i>
                  )}
                  <p className="m-0">
                    {parsing ? (
                      "Reading your receipt..."
                    ) : fileName ? (
                      <>
                        <span className="text-accent">{escapeHtml(fileName)}</span> attached
                      </>
                    ) : (
                      "Drop a receipt photo here or click to browse"
                    )}
                  </p>
                  <span className="dropzone-subtext">
                    Photos of physical receipts, screenshots of Grab / PayNow / SimplyGo receipts.
                    JPG, PNG, PDF up to 10MB.
                  </span>
                </div>
                {receiptMissing && (
                  <div className="text-danger text-xs mt-2">
                    <i className="fa-solid fa-circle-exclamation mr-1"></i>
                    A receipt is required for claims above {formatSGD(RECEIPT_REQUIRED_OVER)}.
                    Rule: <code>block-missing-receipt-over-threshold</code>.
                  </div>
                )}
                {viewUrl && (
                  <div className="text-success text-xs mt-2">
                    <i className="fa-solid fa-circle-check mr-1"></i>
                    Receipt stored.{" "}
                    <a href={viewUrl} target="_blank" rel="noreferrer">
                      View uploaded image
                    </a>{" "}
                    <span className="text-text-tertiary">(link valid 15 minutes)</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2 font-medium"
                disabled={submitting || formInvalid}
              >
                {submitting ? "Submitting..." : "Submit Claim"}
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
          <div className="workspace-card p-6 h-full">
            <h3 className="panel-subtitle mb-4">Recent Claims</h3>
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
                    onClick={() => setActiveClaim(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setActiveClaim(item);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-text-primary m-0 text-sm mb-1">
                          {escapeHtml(item.type)} Claim
                        </h4>
                        <span className="text-text-secondary block text-xs">{item.date}</span>
                      </div>
                      <div className="text-right">
                        <span className={`badge-custom badge-${item.status.toLowerCase()} mb-1`}>
                          {item.status}
                        </span>
                        <span className="block font-bold text-text-primary text-sm">
                          {formatSGD(item.amount)}
                        </span>
                      </div>
                    </div>
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
    </section>
  );
}
