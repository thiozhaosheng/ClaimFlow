const CSV_HEADERS = [
  "Date",
  "Time",
  "Claim ID",
  "Employee",
  "Department",
  "Category",
  "Amount",
  "Status",
  "Action",
  "Reason",
  "Actor",
  "Role",
];

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function exportAuditLogToCsv(logs, { filenameSuffix = "" } = {}) {
  if (!logs || logs.length === 0) return false;

  const rows = logs.map((log) => [
    log.date,
    log.time,
    log.id,
    log.employee,
    log.department,
    log.type,
    log.amount != null ? log.amount.toFixed(2) : "",
    log.status,
    log.action,
    log.reason || "",
    log.actor,
    log.role,
  ]);

  const csv = [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().split("T")[0];
  const suffix = filenameSuffix ? `_${filenameSuffix}` : "";
  const filename = `ClaimFlow_AuditTrail${suffix}_${dateStamp}.csv`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
