/**
 * Claims repository — the boundary between UI and data source.
 * Backed by localStorage state in the browser to enable fully stateful interactive demo flows.
 */
import type { Claim, ClaimActivity, ClaimStatus } from "@/core/domain/types";
import { MOCK_CLAIMS, MOCK_ACTIVITY } from "@/data/mock/claims";
import { evaluatePolicies } from "@/core/domain/policy/engine";

export interface ClaimsRepository {
  list(): Promise<Claim[]>;
  getById(id: string): Promise<Claim | null>;
  activityFor(id: string): Promise<ClaimActivity[]>;
  updateStatus(
    id: string,
    status: ClaimStatus,
    actorName: string,
    actorRole: string,
    reason?: string
  ): Promise<Claim>;
  addClaim(
    claim: Omit<Claim, "id" | "status" | "date" | "ocrSource"> & {
      date?: string;
      ocrSource?: any;
    }
  ): Promise<Claim>;
  addActivityComment(
    id: string,
    actorName: string,
    actorRole: string,
    commentText: string
  ): Promise<ClaimActivity>;
  updateClaimFields(
    id: string,
    fields: Partial<Claim>
  ): Promise<Claim>;
}

const STORAGE_KEY = "claimflow_claims_list_v2";
const ACTIVITY_KEY = "claimflow_activity_list_v2";

function getStoredClaims(): Claim[] {
  if (typeof window === "undefined") return MOCK_CLAIMS;
  const val = localStorage.getItem(STORAGE_KEY);
  if (!val) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CLAIMS));
    return MOCK_CLAIMS;
  }
  try {
    return JSON.parse(val);
  } catch (e) {
    return MOCK_CLAIMS;
  }
}

function saveStoredClaims(claims: Claim[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }
}

function getStoredActivity(): ClaimActivity[] {
  if (typeof window === "undefined") return MOCK_ACTIVITY;
  const val = localStorage.getItem(ACTIVITY_KEY);
  if (!val) {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(MOCK_ACTIVITY));
    return MOCK_ACTIVITY;
  }
  try {
    return JSON.parse(val);
  } catch (e) {
    return MOCK_ACTIVITY;
  }
}

function saveStoredActivity(activity: ClaimActivity[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  }
}

const latency = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const mockClaimsRepository: ClaimsRepository = {
  async list() {
    await latency(150);
    return getStoredClaims();
  },
  async getById(id) {
    await latency(100);
    const claims = getStoredClaims();
    return claims.find((c) => c.id === id) ?? null;
  },
  async activityFor(id) {
    await latency(100);
    const claim = getStoredClaims().find((c) => c.id === id);
    if (!claim) return [];

    const activities = getStoredActivity();
    // Filter activities stored in localStorage that contain the claim ID
    const storedFiltered = activities.filter(
      (a) => a.action.includes(id) || a.id === `act-${id}` || a.id.includes(id)
    );

    // Generate a coherent baseline audit trail based on the claim's status and metadata
    const baseline: ClaimActivity[] = [];

    // 1. All claims start with submission
    baseline.push({
      id: `baseline-submit-${id}`,
      actor: claim.employee,
      role: "Employee",
      action: `Claim submitted (Claim ${id})`,
      status: "Pending",
      date: claim.date,
      time: "09:00 AM",
    });

    // 2. If claim is Endorsed or Paid, add Marcus Lim's endorsement (occurring later than submission)
    if (claim.status === "Endorsed" || claim.status === "Paid") {
      baseline.push({
        id: `baseline-endorse-${id}`,
        actor: "Marcus Lim",
        role: "Approving Officer",
        action: `Claim endorsed — routed to Finance (Claim ${id})`,
        status: "Endorsed",
        date: claim.date,
        time: "11:30 AM",
      });
    }

    // 3. If claim is Paid, add Dan Yeo's payout disburse (occurring later than endorsement)
    if (claim.status === "Paid") {
      baseline.push({
        id: `baseline-paid-${id}`,
        actor: "Dan Yeo",
        role: "Finance Admin",
        action: `Disbursed via FAST Transfer (Claim ${id})`,
        status: "Paid",
        date: claim.date,
        time: "03:45 PM",
      });
    }

    // 4. If claim is Rejected, add Marcus Lim's rejection (occurring later than submission)
    if (claim.status === "Rejected") {
      baseline.push({
        id: `baseline-reject-${id}`,
        actor: "Marcus Lim",
        role: "Approving Officer",
        action: `Claim rejected: Policy flag trigger (Claim ${id})`,
        status: "Rejected",
        date: claim.date,
        time: "11:30 AM",
        reason: (claim.details?.rejectionReason as string) || "Policy compliance warning: Missing client meeting details in description. Please provide names of dinner attendees.",
      });
    }

    // Combine them, avoiding duplicates for statuses already recorded in storedFiltered
    const merged = [...storedFiltered];
    
    for (const baseAct of baseline) {
      const alreadyExists = storedFiltered.some(
        (a) => a.status === baseAct.status || (a.action.includes("submit") && baseAct.action.includes("submit"))
      );
      if (!alreadyExists) {
        merged.push(baseAct);
      }
    }

    // Parse date and time to construct a sortable timestamp
    const getTimestamp = (a: ClaimActivity) => {
      const datePart = a.date; // e.g. "2026-06-18"
      const timePart = a.time || "00:00";
      
      const isPM = /pm/i.test(timePart);
      const isAM = /am/i.test(timePart);
      
      const digits = timePart.replace(/[^\d:]/g, "").split(":");
      let hours = digits[0] ? parseInt(digits[0], 10) : 0;
      const minutes = digits[1] ? parseInt(digits[1], 10) : 0;
      
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      
      const [year, month, day] = datePart.split("-").map(Number);
      return new Date(year, month - 1, day, hours, minutes).getTime();
    };

    // Sort chronologically in reverse (newest timestamp first)
    merged.sort((a, b) => getTimestamp(b) - getTimestamp(a));

    return merged;
  },
  async updateStatus(id, status, actorName, actorRole, reason) {
    await latency(200);
    const claims = getStoredClaims();
    const claimIndex = claims.findIndex((c) => c.id === id);
    if (claimIndex === -1) {
      throw new Error("Claim not found");
    }
    
    claims[claimIndex].status = status;
    if (status === "Rejected" && reason) {
      claims[claimIndex].flagged = true;
    }
    saveStoredClaims(claims);

    const activities = getStoredActivity();
    const now = new Date();
    
    let actionText = `Claim status updated to ${status}`;
    if (status === "Endorsed") {
      actionText = "Claim endorsed — routed to Finance";
    } else if (status === "Rejected") {
      actionText = `Claim rejected: ${reason}`;
    } else if (status === "Paid") {
      actionText = "Disbursed via GIRO/PayNow";
    }

    const newActivity: ClaimActivity = {
      id: `a${activities.length + 1}`,
      actor: actorName,
      role: actorRole,
      action: `${actionText} (Claim ${id})`,
      status: status,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reason,
    };
    
    activities.unshift(newActivity);
    saveStoredActivity(activities);

    return claims[claimIndex];
  },
  async addClaim(claimData) {
    await latency(250);
    const claims = getStoredClaims();
    const activities = getStoredActivity();
    
    const newId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = claimData.date || now.toISOString().split("T")[0];

    // Construct policy context for automatic AI audit
    const policyCtx = {
      category: claimData.type,
      amount: claimData.amount,
      receiptUrl: claimData.receiptUrl,
      expenseDate: dateStr,
      supplierGstRegNumber: (claimData.details?.supplierGstRegNumber as string) ?? null,
      details: {
        ...claimData.details,
        gstAmount: claimData.gstAmount,
      },
      employee: claimData.employee,
      merchant: claimData.merchant,
    };

    // Evaluate policies using existing claims list for duplicate detection
    const policyResult = evaluatePolicies(policyCtx, claims);

    let initialStatus: ClaimStatus = "Pending";
    let isFlagged = false;

    if (policyResult.outcome === "auto-approve") {
      initialStatus = "Endorsed"; // Auto-approved and routed to Finance
    } else if (policyResult.outcome === "block") {
      isFlagged = true; // Flagged in UI but allowed for audit tracing
    }

    const newClaim: Claim = {
      ...claimData,
      id: newId,
      status: initialStatus,
      date: dateStr,
      ocrSource: claimData.ocrSource || "demo",
      gstAmount: claimData.gstAmount || null,
      merchant: claimData.merchant || null,
      bank: claimData.bank || "DBS **** 7855",
      receiptUrl: claimData.receiptUrl || null,
      flagged: isFlagged,
    };
    
    claims.unshift(newClaim);
    saveStoredClaims(claims);

    const actionText = initialStatus === "Endorsed"
      ? `Claim auto-approved by AI compliance — all rules met (${policyResult.ruleId}) (Claim ${newId})`
      : isFlagged
        ? `Policy compliance warning: ${policyResult.message} (Claim ${newId})`
        : `Claim submitted — routed to manager (Claim ${newId})`;

    const newActivity: ClaimActivity = {
      id: `a${activities.length + 1}`,
      actor: initialStatus === "Endorsed" ? "ClaimFlow AI Audit" : claimData.employee,
      role: initialStatus === "Endorsed" ? "System" : "Employee",
      action: actionText,
      status: initialStatus,
      date: dateStr,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    
    activities.unshift(newActivity);
    saveStoredActivity(activities);

    return newClaim;
  },
  async addActivityComment(id, actorName, actorRole, commentText) {
    await latency(100);
    const claims = getStoredClaims();
    const claim = claims.find((c) => c.id === id);
    if (!claim) {
      throw new Error("Claim not found");
    }

    const activities = getStoredActivity();
    const now = new Date();
    
    const newActivity: ClaimActivity = {
      id: `comment-${id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor: actorName,
      role: actorRole,
      action: commentText,
      status: claim.status,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isComment: true,
    };
    
    activities.unshift(newActivity);
    saveStoredActivity(activities);
    
    return newActivity;
  },
  async updateClaimFields(id, fields) {
    await latency(200);
    const claims = getStoredClaims();
    const claimIndex = claims.findIndex((c) => c.id === id);
    if (claimIndex === -1) {
      throw new Error("Claim not found");
    }
    
    // Merge new fields
    const updated = {
      ...claims[claimIndex],
      ...fields,
    };
    
    // Re-evaluate policies!
    const policyCtx = {
      category: updated.type,
      amount: updated.amount,
      receiptUrl: updated.receiptUrl,
      expenseDate: updated.date,
      supplierGstRegNumber: (updated.details?.supplierGstRegNumber as string) || null,
      details: {
        ...updated.details,
        gstAmount: updated.gstAmount,
      },
      employee: updated.employee,
      merchant: updated.merchant,
    };
    
    const otherClaims = claims.filter(c => c.id !== id);
    const policyResult = evaluatePolicies(policyCtx, otherClaims);
    
    // If all rules passed (no mismatch/limit exceptions that flag block), unflag!
    updated.flagged = policyResult.outcome === "block";
    
    claims[claimIndex] = updated;
    saveStoredClaims(claims);
    
    // Add activity trail for self-correction
    const activities = getStoredActivity();
    const now = new Date();
    const newActivity: ClaimActivity = {
      id: `self-correct-${id}-${Date.now()}`,
      actor: updated.employee,
      role: "Employee",
      action: `Self-corrected claim details: ${Object.keys(fields).map(k => `${k} updated to ${(fields as any)[k]}`).join(", ")} (Claim ${id})`,
      status: updated.status,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    activities.unshift(newActivity);
    saveStoredActivity(activities);
    
    return updated;
  },
};

export const claimsRepository: ClaimsRepository = mockClaimsRepository;
