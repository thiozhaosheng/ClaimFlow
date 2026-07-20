import categoryFields from "../data/categoryFields.json";
import { OcrFieldTag } from "./ocrfeedback.jsx";

// Renders the per-category extra fields under the base claim form.
// Reads schema from data/categoryFields.json — same source the backend
// policy engine references for rules like "details.businessJustification".
export default function CategoryFields({ category, details, onChange, ocrFields, ocrLive, formErrors, clearError }) {
  const spec = categoryFields[category];
  if (!spec || !spec.fields || spec.fields.length === 0) return null;

  const update = (key, value) => {
    onChange({ ...(details || {}), [key]: value });
    if (clearError) clearError(key);
  };

  return (
    <div className="mt-2 mb-3 rounded-ds-md border border-border-subtle bg-subtle/40 px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
          {spec.label || category} — extra details
        </span>
        <span className="text-[10px] text-text-tertiary">
          Required for policy &amp; compliance
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2">
        {spec.fields.map((f) => {
          const value = details?.[f.key] ?? (f.type === "number" ? "" : "");
          const required = !!f.required;
          const fullWidth = f.type === "textarea";
          return (
            <div
              key={f.key}
              className={fullWidth ? "md:col-span-2" : undefined}
            >
              <label className="flex items-center flex-wrap gap-1 text-[12px] font-medium text-text-primary mb-1">
                {f.label}
                {required && (
                  <span className="text-danger-text mr-1" aria-hidden="true">
                    *
                  </span>
                )}
                {ocrFields && ocrFields.has(f.key) ? (
                  <OcrFieldTag live={ocrLive} />
                ) : required && (!value) ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning-bg text-warning-text border border-warning-border tracking-wide uppercase">
                    Manual entry
                  </span>
                ) : null}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className={`form-control resize-none ${formErrors && formErrors[f.key] ? "border-danger" : ""}`}
                  style={{ minHeight: 56, maxHeight: 80 }}
                  rows={2}
                  value={value}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={required}
                />
              ) : f.type === "select" ? (
                <select
                  className={`form-select ${formErrors && formErrors[f.key] ? "border-danger" : ""}`}
                  value={value}
                  onChange={(e) => update(f.key, e.target.value)}
                  required={required}
                >
                  <option value="">Choose…</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  className={`form-control ${formErrors && formErrors[f.key] ? "border-danger" : ""}`}
                  value={value}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={required}
                  min={f.min}
                  max={f.max}
                />
              )}
              {formErrors && formErrors[f.key] && (
                <div className="text-danger-text text-[11px] mt-0.5">{formErrors[f.key]}</div>
              )}
              {f.help && !formErrors?.[f.key] && (
                <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">
                  {f.help}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper: return list of required-but-missing field keys for a given
// category + details state. Used to disable submit until filled.
export function missingRequiredCategoryFields(category, details) {
  const spec = categoryFields[category];
  if (!spec || !spec.fields) return [];
  const missing = [];
  for (const f of spec.fields) {
    if (!f.required) continue;
    const v = details?.[f.key];
    if (v === undefined || v === null || v === "") missing.push(f.key);
  }
  return missing;
}
