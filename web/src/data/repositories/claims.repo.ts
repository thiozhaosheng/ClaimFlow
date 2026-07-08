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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("claimflow_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
  return response.json();
}

export interface ReceiptParseResult {
  merchant: string | null;
  total: number | null;
  gstAmount: number | null;
  currency: string | null;
  expenseDate: string | null;
  transactionTime: string | null;
  category: string | null;
  items: string[];
  route: { from: string; to: string } | null;
  // No mock source — the backend either returns a real Azure extraction or
  // "unavailable" (not configured, failed, or timed out). No fake data.
  source: "azure" | "unavailable";
  receiptUrl: string | null;
  viewUrl: string | null;
}

// Uploads a receipt file to the real backend for OCR (Azure Document
// Intelligence, or the backend's own deterministic mock if Azure isn't
// configured there). No client-side fallback — a network/backend failure
// throws, and the caller is responsible for surfacing that rather than
// silently substituting fake data.
export async function parseReceiptFile(file: File): Promise<ReceiptParseResult> {
  const token = typeof window !== "undefined" ? localStorage.getItem("claimflow_token") : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const formData = new FormData();
  formData.append("receipt", file);
  const response = await fetch(`${API_BASE_URL}/claims/parse-receipt`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Receipt parsing failed with status ${response.status}`);
  }
  const json = await response.json();
  return json.data;
}

function mapClaim(c: any): Claim {
  return {
    id: `CLM-${c.id}`,
    employee: c.user?.name || "Unspecified",
    department: c.user?.department || "General",
    type: c.category,
    title: c.details?.title || c.merchant || c.category || "Untitled Expense",
    amount: Number(c.amount),
    gstAmount: c.gstAmount ? Number(c.gstAmount) : null,
    date: c.expenseDate ? c.expenseDate.split("T")[0] : new Date().toISOString().split("T")[0],
    merchant: c.merchant,
    bank: c.bank || "DBS **** 7855",
    status: c.status,
    receiptUrl: c.receiptUrl,
    ocrSource: c.ocrSource,
    details: c.details || {},
    flagged: c.flagged,
  };
}

function mapActivity(l: any): ClaimActivity {
  const dateStr = new Date(l.createdAt).toISOString();
  return {
    id: String(l.id),
    actor: l.executor?.name || "System",
    role: l.executor?.role || "System",
    action: l.action === 'COMMENT' ? l.remarks : `${l.action} (Claim CLM-${String(l.claimId).padStart(3, '0')})`,
    status: l.newStatus,
    date: dateStr.split("T")[0],
    time: new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    reason: l.remarks || undefined,
    isComment: l.action === 'COMMENT',
  };
}

export const apiClaimsRepository: ClaimsRepository = {
  async list() {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("claimflow_user") : null;
    let isEmployee = true;
    if (userStr) {
      const user = JSON.parse(userStr);
      isEmployee = user.role === 'Employee';
    }
    const path = isEmployee ? '/claims/my' : '/claims';
    const res = await apiRequest(path);
    const claims = res.data?.claims || [];
    return claims.map(mapClaim);
  },
  async getById(id) {
    const numericId = id.replace("CLM-", "");
    const res = await apiRequest(`/claims/${numericId}`);
    return mapClaim(res.data.claim);
  },
  async activityFor(id) {
    const numericId = id.replace("CLM-", "");
    const res = await apiRequest(`/claims/${numericId}/activity`);
    const logs = res.data?.logs || [];
    return logs.map(mapActivity);
  },
  async updateStatus(id, status, actorName, actorRole, reason) {
    const numericId = id.replace("CLM-", "");
    let res;
    if (status === "Endorsed" || status === "Rejected") {
      res = await apiRequest(`/workflow/review/${numericId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: status === "Endorsed" ? "approve" : "reject",
          remarks: reason,
        }),
      });
    } else if (status === "Paid") {
      res = await apiRequest(`/workflow/pay/${numericId}`, {
        method: "PATCH",
        body: JSON.stringify({
          remarks: reason,
        }),
      });
    } else {
      throw new Error(`Unsupported status update: ${status}`);
    }
    return mapClaim(res.data.claim);
  },
  async addClaim(claimData) {
    const body = {
      amount: claimData.amount,
      gstAmount: claimData.gstAmount,
      merchant: claimData.merchant,
      category: claimData.type,
      expenseDate: new Date(claimData.date || new Date()).toISOString(),
      receiptUrl: claimData.receiptUrl,
      ocrSource: claimData.ocrSource,
      details: {
        ...claimData.details,
        title: claimData.title,
      },
    };
    const res = await apiRequest('/claims', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return mapClaim(res.data.claim);
  },
  async addActivityComment(id, actorName, actorRole, commentText) {
    const numericId = id.replace("CLM-", "");
    const res = await apiRequest(`/claims/${numericId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ commentText }),
    });
    return mapActivity({
      ...res.data.log,
      executor: { name: actorName, role: actorRole }
    });
  },
  async updateClaimFields(id, fields) {
    const numericId = id.replace("CLM-", "");
    const body: any = {};
    if ('amount' in fields) body.amount = fields.amount;
    if ('gstAmount' in fields) body.gstAmount = fields.gstAmount;
    if ('merchant' in fields) body.merchant = fields.merchant;
    if ('type' in fields) body.category = fields.type;
    if ('date' in fields) body.expenseDate = new Date(fields.date!).toISOString();
    
    if ('details' in fields || 'title' in fields) {
      body.details = {
        ...fields.details,
        ...(fields.title ? { title: fields.title } : {}),
      };
    }
    
    const res = await apiRequest(`/claims/${numericId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return mapClaim(res.data.claim);
  },
};

/**
 * Switches per-call between the live API and the mock repository based on
 * whether a backend session token is present. Deliberately no fallback: once
 * authenticated against the real backend, calls stay live so a failure
 * surfaces as an error rather than silently showing mock data underneath a
 * real session.
 */
export const hybridClaimsRepository: ClaimsRepository = {
  list() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.list();
    return mockClaimsRepository.list();
  },
  getById(id) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.getById(id);
    return mockClaimsRepository.getById(id);
  },
  activityFor(id) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.activityFor(id);
    return mockClaimsRepository.activityFor(id);
  },
  updateStatus(id, status, actorName, actorRole, reason) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.updateStatus(id, status, actorName, actorRole, reason);
    return mockClaimsRepository.updateStatus(id, status, actorName, actorRole, reason);
  },
  addClaim(claim) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.addClaim(claim);
    return mockClaimsRepository.addClaim(claim);
  },
  addActivityComment(id, actorName, actorRole, commentText) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.addActivityComment(id, actorName, actorRole, commentText);
    return mockClaimsRepository.addActivityComment(id, actorName, actorRole, commentText);
  },
  updateClaimFields(id, fields) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("claimflow_token") : null;
    if (token) return apiClaimsRepository.updateClaimFields(id, fields);
    return mockClaimsRepository.updateClaimFields(id, fields);
  },
};

export const claimsRepository: ClaimsRepository = hybridClaimsRepository;
