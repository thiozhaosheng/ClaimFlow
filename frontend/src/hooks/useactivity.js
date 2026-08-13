import { useCallback, useEffect, useState } from "react";
import { api, mapRoleFromApi } from "../utils/api.js";
import { actionLabel, remarkText } from "../lib/auditTrail.js";

/**
 * A claim's real audit trail.
 *
 * The claim record has always had a table headed "When / Action / By / Note",
 * and for every role except finance it was filled from the CLAIM LIST: the page
 * filtered `claimsDb` down to the claim itself and rendered that single row,
 * whose `action` field is the literal string "Claim submitted" set in
 * `adaptClaim`. So the trail on a claim that had been routed, sent back for a
 * correction, corrected and endorsed showed one invented line — on the screen
 * the product offers as proof of what happened.
 *
 * GET /api/claims/:id/activity has existed the whole time, returns the real
 * entries with their executors, and nothing called it.
 *
 * @param {number|string|null} rawId the numeric claim id (not the CLM- reference)
 */
export function useActivity(rawId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Bumped after an action on the claim, because the API writes an entry for
  // it. Without this, saving a correction added CORRECTION_SUBMITTED to the
  // trail on the server and left the table on screen showing the two entries
  // it had loaded a minute earlier — a record that is out of date the moment
  // you use it is worse than no record.
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (rawId === null || rawId === undefined) {
      setEntries([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    api
      .get(`/api/claims/${rawId}/activity`)
      .then((res) => {
        if (cancelled) return;
        const logs = res?.data?.logs || [];
        setEntries(logs.map(adaptEntry).sort((a, b) => b.at - a.at));
      })
      .catch(() => {
        // Reported rather than retried: the record says the trail could not be
        // loaded, which is honest. Showing an empty table would read as "nothing
        // has happened to this claim", the one thing it must never say wrongly.
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawId, nonce]);

  return { entries, loading, failed, refresh };
}

function adaptEntry(log) {
  const executor = log.executor || {};
  const at = log.createdAt ? new Date(log.createdAt) : null;
  const valid = at && !Number.isNaN(at.getTime());
  return {
    id: log.id,
    at: valid ? at.getTime() : 0,
    date: valid ? at.toLocaleDateString("en-CA") : "—",
    time: valid
      ? at.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "",
    action: actionLabel(log.action),
    actionKey: log.action,
    actor: executor.name || "System",
    role: mapRoleFromApi(executor.role || "Employee"),
    note: remarkText(log.remarks),
  };
}
