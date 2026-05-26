import { useState, useEffect, useCallback, useMemo } from "react";
import { api, mapStatusFromApi, mapRoleFromApi } from "../utils/api.js";
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
    date: expenseDate,
    time,
    type: claim.category,
    department: user.department || "Sales",
    amount: Number(claim.amount),
    status: mapStatusFromApi(claim.status),
    actor: user.name || "Unknown",
    role: mapRoleFromApi(user.role || "Employee"),
    action: "Claim submitted",
    bank: deriveBankLabel(claim.id),
    receiptUrl: claim.receiptUrl || null,
    gstAmount: claim.gstAmount != null ? Number(claim.gstAmount) : null,
    merchant: claim.merchant || null,
  };
}

// stable pseudo-bank label per claim id so the UI looks populated;
// the real bank account will come from the user profile once that's wired up
const SG_BANKS = ["DBS", "POSB", "OCBC", "UOB", "Standard Chartered"];
function deriveBankLabel(id) {
  const bank = SG_BANKS[id % SG_BANKS.length];
  const last4 = String(1000 + (id * 1373) % 8999).slice(-4);
  return `${bank} **** ${last4}`;
}

// Adapt a backend AuditLog (with executor include) into the frontend's log shape.
function adaptAuditLog(log) {
  const executor = log.executor || {};
  const createdAt = log.createdAt ? new Date(log.createdAt) : new Date();
  return {
    id: `CLM-${String(log.claimId).padStart(3, "0")}`,
    rawId: log.claimId,
    employee: executor.name || "Unknown",
    date: createdAt.toISOString().slice(0, 10),
    time: createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    type: log.action,
    department: "—",
    amount: 0,
    status: mapStatusFromApi(log.newStatus),
    actor: executor.name || "System",
    role: mapRoleFromApi(executor.role || "FinanceAdmin"),
    action: log.action.replace(/_/g, " ").toLowerCase(),
    reason: log.remarks || undefined,
    bank: "—",
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
  }, [fetchClaimsForRole]);

  const latestMap = useMemo(() => {
    const map = {};
    for (const claim of claims) {
      map[claim.id] = claim;
    }
    return map;
  }, [claims]);

  const submitClaim = useCallback(
    async ({ date, category, amount, gstAmount, merchant }) => {
      const created = await api.post("/api/claims", {
        amount: Number(amount),
        gstAmount:
          gstAmount === "" || gstAmount === null || gstAmount === undefined
            ? null
            : Number(gstAmount),
        merchant: merchant || null,
        category,
        expenseDate: date,
      });
      await fetchClaimsForRole();
      return adaptClaim(created?.data?.claim);
    },
    [fetchClaimsForRole],
  );

  const updateClaimStatus = useCallback(
    async (claimId, newStatus, _actorName, reason = null) => {
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
    loading,
    error,
    refetch: fetchClaimsForRole,
  };
}
