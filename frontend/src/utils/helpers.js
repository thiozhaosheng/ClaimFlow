export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateTimestamp() {
  const rightNow = new Date();
  let hr = rightNow.getHours();
  const min = String(rightNow.getMinutes()).padStart(2, "0");
  const period = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${String(hr).padStart(2, "0")}:${min} ${period}`;
}

export function getIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function getTimeString() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Singapore dollar formatter — keeps tabular alignment on the dashboards
const SGD_FORMATTER = new Intl.NumberFormat("en-SG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatSGD(amount) {
  const n = Number(amount);
  if (!isFinite(n)) return "S$0.00";
  return `S$${SGD_FORMATTER.format(n)}`;
}

// SG-style date (DD MMM YYYY, e.g. 26 May 2026)
export function formatSGDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
