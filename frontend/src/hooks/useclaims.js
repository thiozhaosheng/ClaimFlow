import { useState, useEffect, useCallback, useMemo } from "react";
import { api, mapRoleFromApi } from "../utils/api.js";
import { useAuth } from "../context/authcontext.jsx";
import { actionLabel, remarkText } from "../lib/auditTrail.js";

// Adapt a backend Claim (with user include) into the frontend's row shape.
// Exported so a single claim fetched on its own (the record page, for one that
// is not in the current list) goes through exactly the same mapping.
export function adaptClaim(claim) {
  if (!claim) return null;
  const user = claim.user || {};
  const expenseDate = claim.expenseDate
    ? new Date(claim.expenseDate).toISOString().slice(0, 10)
    : "";
  const createdAt = claim.createdAt ? new Date(claim.createdAt) : new Date();
  const time = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    id: `CLM-${String(claim.id).padStart(3, "0")}`,
    rawId: claim.id,
    employee: user.name || "Unknown",
    employeeEmail: user.email || "",
    avatarUrl: user.avatarUrl || null,
    date: expenseDate,
    time,
    type: claim.category,
    // Not "Sales": an unset department was being shown as a real one, which
    // puts a claim in a department it may not belong to on every screen that
    // groups or filters by it.
    department: user.department || null,
    amount: Number(claim.amount),
    status: claim.status,
    actor: user.name || "Unknown",
    role: mapRoleFromApi(user.role || "Employee"),
    action: "Claim submitted",
    receiptUrl: claim.receiptUrl || null,
    ocrSource: claim.ocrSource || null,
    gstAmount: claim.gstAmount != null ? Number(claim.gstAmount) : null,
    merchant: claim.merchant || null,
    description: claim.description || null,
    // The two fields IRAS wants on a tax invoice above S$1,000. They are
    // columns on the claim and the policy engine speaks about them, but
    // nothing has ever carried them to the screen where finance checks them.
    supplierGstRegNumber: claim.supplierGstRegNumber || null,
    taxInvoiceNumber: claim.taxInvoiceNumber || null,
    details: claim.details || null,
    // Never mapped, because every list endpoint filters withdrawn claims out —
    // so it was always undefined and nothing noticed. The record page can now
    // open a claim that is not in the list, and a withdrawn one arrived reading
    // "Pending / With the approving officer" over an audit trail whose only
    // entry said Withdrawn.
    withdrawn: claim.withdrawn === true,
    withdrawnAt: claim.withdrawnAt || null,
    createdAt: claim.createdAt || null,
    updatedAt: claim.updatedAt || null,
  };
}


// Adapt a backend AuditLog (executor and claim included) into the log shape the
// finance table and its CSV expect.
//
// Three fields used to be filled in with nothing, because the endpoint returned
// only the log row and its executor: the amount was hardcoded to 0, the
// department to an em dash, and `employee` was set to the executor — so the
// Employee and Actor columns printed the same name on every row, and the ledger
// reported S$0.00 against every action. The claim now travels with the log, so
// the submitter, the amount and the department are the real ones.
function adaptAuditLog(log) {
  const executor = log.executor || {};
  const claim = log.claim || {};
  const submitter = claim.user || {};
  const createdAt = log.createdAt ? new Date(log.createdAt) : new Date();
  return {
    id: `CLM-${String(log.claimId).padStart(3, "0")}`,
    rawId: log.claimId,
    employee: submitter.name || "Unknown",
    // Local date, not the UTC one. These two lines used to disagree: the date
    // came off toISOString() and the time off the local clock, so an approval
    // at 06:28 on the 13th in Singapore was filed as "2026-08-12 06:28 AM" —
    // a date and a time from different days, on the audit trail, which is the
    // one place a timestamp has to be right. Everything after 08:00 SGT was
    // stamped with the previous day.
    date: createdAt.toLocaleDateString("en-CA"),
    time: createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    type: claim.category || log.action,
    department: submitter.department || "—",
    amount: claim.amount != null ? Number(claim.amount) : 0,
    status: log.newStatus,
    actor: executor.name || "System",
    role: mapRoleFromApi(executor.role || "FinanceAdmin"),
    // The raw action travels alongside the label. Filtering on the rendered
    // string is how the audit trail's Submitted / Endorsed / Paid buttons came
    // to match nothing at all — no action has ever rendered as "Claim
    // submitted" or "Marked as paid", so all three emptied the table.
    actionKey: log.action,
    action: actionLabel(log.action),
    createdAt: log.createdAt || null,
    reason: remarkText(log.remarks) || undefined,
  };
}

// Every mounted useClaims() is its own island of state — the workspace and
// the rail each hold one. A submit refreshed the instance that submitted and
// left the rail's counts standing ("All claims 12" beside a table saying 13)
// until the next 25s poll. Mutations announce themselves here so every other
// instance refetches at once; the mutating instance already awaits its own.
const claimsListeners = new Set();
function announceClaimsChanged(except) {
  for (const listener of claimsListeners) {
    if (listener !== except) listener();
  }
}

export function useClaims() {
  const { session } = useAuth();
  const [claims, setClaims] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClaimsForRole = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const claimsEndpoint =
        session.role === "employee" ? "/api/claims/my" : "/api/claims";
      const result = await api.get(claimsEndpoint);
      const list = result?.data?.claims || [];
      setClaims(list.map(adaptClaim));

      if (session.role === "finance") {
        const auditResult = await api.get("/api/workflow/audit");
        const logs = auditResult?.data?.logs || [];
        setAuditLog(logs.map(adaptAuditLog));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchClaimsForRole();
    if (!session) return undefined;
    // Poll every 25s so claim status updates from other roles surface
    // without a manual refresh. Cheap, no websockets.
    const id = setInterval(fetchClaimsForRole, 25_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchClaimsForRole();
    };
    document.addEventListener("visibilitychange", onVisibility);
    claimsListeners.add(fetchClaimsForRole);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      claimsListeners.delete(fetchClaimsForRole);
    };
  }, [fetchClaimsForRole, session]);

  const latestMap = useMemo(() => {
    const map = {};
    for (const claim of claims) {
      map[claim.id] = claim;
    }
    return map;
  }, [claims]);

  const submitClaim = useCallback(
    async ({ date, category, amount, gstAmount, merchant, receiptUrl, ocrSource, details }) => {
      const created = await api.post("/api/claims", {
        amount: Number(amount),
        gstAmount:
          gstAmount === "" || gstAmount === null || gstAmount === undefined
            ? null
            : Number(gstAmount),
        merchant: merchant || null,
        category,
        expenseDate: date,
        receiptUrl: receiptUrl || null,
        ocrSource: ocrSource || null,
        details: details || null,
      });
      await fetchClaimsForRole();
      announceClaimsChanged(fetchClaimsForRole);
      return { claim: adaptClaim(created?.data?.claim), policy: created?.policy };
    },
    [fetchClaimsForRole],
  );

  const updateClaimStatus = useCallback(
    // No actor argument: the API records whoever the token belongs to. Callers
    // used to pass the string "Lisa Wang" here, a person who exists nowhere in
    // this system, and it was silently discarded.
    async (claimId, newStatus, reason = null) => {
      const claim = claims.find((c) => c.id === claimId);
      if (!claim) return;
      const action = newStatus === "Endorsed" ? "approve" : "reject";
      await api.patch(`/api/workflow/review/${claim.rawId}`, {
        action,
        remarks: reason || undefined,
      });
      await fetchClaimsForRole();
      announceClaimsChanged(fetchClaimsForRole);
    },
    [claims, fetchClaimsForRole],
  );

  const batchMarkAsPaid = useCallback(
    async (selectedIds) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      for (const id of ids) {
        const claim = claims.find((c) => c.id === id);
        if (claim) {
          await api.patch(`/api/workflow/pay/${claim.rawId}`, {});
        }
      }
      await fetchClaimsForRole();
      announceClaimsChanged(fetchClaimsForRole);
    },
    [claims, fetchClaimsForRole],
  );

  const editClaim = useCallback(
    async (claimId, updates) => {
      const claim = claims.find((c) => c.id === claimId);
      if (!claim) return;
      const payload = {};
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.amount !== undefined) payload.amount = Number(updates.amount);
      if (updates.merchant !== undefined)
        payload.merchant = updates.merchant || null;
      if (updates.expenseDate !== undefined)
        payload.expenseDate = updates.expenseDate;
      if (updates.gstAmount !== undefined) {
        payload.gstAmount =
          updates.gstAmount === "" ||
          updates.gstAmount === null ||
          updates.gstAmount === undefined
            ? null
            : Number(updates.gstAmount);
      }
      await api.patch(`/api/claims/${claim.rawId}`, payload);
      await fetchClaimsForRole();
      announceClaimsChanged(fetchClaimsForRole);
    },
    [claims, fetchClaimsForRole],
  );

  const withdrawClaim = useCallback(
    async (claimId) => {
      const claim = claims.find((c) => c.id === claimId);
      if (!claim) return;
      await api.patch(`/api/claims/${claim.rawId}/withdraw`, {});
      await fetchClaimsForRole();
      announceClaimsChanged(fetchClaimsForRole);
    },
    [claims, fetchClaimsForRole],
  );

  // claimsDb shape: for finance, the audit log; otherwise, the claim list
  const claimsDb = useMemo(() => {
    if (session?.role === "finance") {
      return auditLog;
    }
    return claims;
  }, [auditLog, claims, session?.role]);

  return {
    claimsDb,
    latestMap,
    submitClaim,
    updateClaimStatus,
    batchMarkAsPaid,
    editClaim,
    withdrawClaim,
    loading,
    error,
    refetch: fetchClaimsForRole,
  };
}
