import { useState, useEffect, useCallback, useMemo } from "react";
import { api, mapRoleFromApi } from "../utils/api.js";
import { useAuth } from "../context/authcontext.jsx";

// Adapt a backend Claim (with user include) into the frontend's row shape.
function adaptClaim(claim) {
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
    department: user.department || "Sales",
    amount: Number(claim.amount),
    status: claim.status,
    actor: user.name || "Unknown",
    role: mapRoleFromApi(user.role || "Employee"),
    action: "Claim submitted",
    receiptUrl: claim.receiptUrl || null,
    ocrSource: claim.ocrSource || null,
    gstAmount: claim.gstAmount != null ? Number(claim.gstAmount) : null,
    merchant: claim.merchant || null,
    details: claim.details || null,
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
    date: createdAt.toISOString().slice(0, 10),
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
    action: log.action.replace(/_/g, " ").toLowerCase(),
    reason: log.remarks || undefined,
  };
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
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
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
    },
    [claims, fetchClaimsForRole],
  );

  const withdrawClaim = useCallback(
    async (claimId) => {
      const claim = claims.find((c) => c.id === claimId);
      if (!claim) return;
      await api.patch(`/api/claims/${claim.rawId}/withdraw`, {});
      await fetchClaimsForRole();
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
