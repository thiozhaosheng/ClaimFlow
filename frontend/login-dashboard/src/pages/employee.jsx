import { useState, useRef } from "react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml } from "../utils/helpers.js";
import WelcomeStrip from "../components/welcomestrip.jsx";
import EmptyState from "../components/emptystate.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";

export default function Employee() {
  const { session } = useAuth();
  const { latestMap, submitClaim, claimsDb, loading, error } = useClaims();
  const { addToast } = useToast();
  const [activeClaim, setActiveClaim] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Travel");
  const [amount, setAmount] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date || !amount || submitting) return;

    setSubmitting(true);
    try {
      const created = await submitClaim({
        title,
        date,
        category,
        amount: parseFloat(amount),
        email: session?.email || "",
      });
      addToast({
        variant: "success",
        title: "Claim submitted",
        message: created
          ? `${created.id} (${created.type} · $${created.amount.toFixed(2)}) is now pending review.`
          : "Your claim is now pending review.",
      });
      setTitle("");
      setDate("");
      setCategory("Travel");
      setAmount("");
      setFileName("");
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

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
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
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="workspace-card p-4">
            <h2 className="workspace-card-title mb-4">
              <span className="plus-icon-badge me-2">
                <i className="fa-solid fa-plus"></i>
              </span>
              Submit New Claim
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Claim Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Client Meeting Lunch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Expense Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Travel">Travel</option>
                    <option value="Meal">Meal</option>
                    <option value="Medical">Medical</option>
                    <option value="Training">Training</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Amount</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-secondary">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control border-start-0 ps-1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Receipt Upload</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="d-none"
                  onChange={handleFileChange}
                />
                <div
                  className={`file-dropzone ${isDragOver ? "dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <i className="fa-solid fa-cloud-arrow-up dropzone-icon mb-2"></i>
                  <p className="m-0">
                    {fileName ? (
                      <>
                        <span className="text-primary">
                          {escapeHtml(fileName)}
                        </span>{" "}
                        ready for upload
                      </>
                    ) : (
                      "Drag and drop your receipt here, or click to browse"
                    )}
                  </p>
                  <span className="dropzone-subtext">
                    PDF, JPG, PNG up to 10MB
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 font-medium"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Claim"}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="workspace-card p-4 h-100">
            <h3 className="panel-subtitle mb-4">Recent Claims</h3>
            <div className="vstack gap-3">
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
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h4 className="font-semibold text-dark m-0 small mb-1">
                          {escapeHtml(item.type)} Claim
                        </h4>
                        <span className="text-secondary block-span small">
                          {item.date}
                        </span>
                      </div>
                      <div className="text-end">
                        <span
                          className={`badge-custom badge-${item.status.toLowerCase()} mb-1`}
                        >
                          {item.status}
                        </span>
                        <span className="block-span font-bold text-dark small">
                          ${item.amount.toFixed(2)}
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
