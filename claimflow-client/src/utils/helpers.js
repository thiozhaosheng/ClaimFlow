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
