import { useEffect, useState } from "react";
import { api } from "../utils/api.js";

/**
 * Resolves a claim's receipt to something an <img> can load, and reports when
 * that image fails.
 *
 * Two kinds of receiptUrl reach the UI. Seeded claims carry a public path
 * ("/test-receipts/real-grab.png") that the browser can request directly.
 * Uploaded ones carry a blob name, which is private — it needs a short-lived
 * view URL from GET /api/claims/:id/receipt before it will load anywhere.
 *
 * This logic was written for the approver's review modal, which is the one
 * place the receipt was ever shown. Everywhere else claimed to have it without
 * showing it: the claim page said "Attached." and stopped, and the detail modal
 * offered "Click to view full image" beside a static icon that could not be
 * clicked. The submitter therefore could not look at their own receipt, in a
 * product whose whole argument is that the receipt settles the question.
 * Sharing the resolver is what makes showing it everywhere cheap.
 *
 * @param {{receiptUrl?: string, rawId?: number|string}} claim
 * @param {boolean} active pass false while the surface is closed, to skip the fetch
 * @returns {{src: string|null, broken: boolean, markBroken: () => void}}
 */
export function useReceipt(claim, active = true) {
  const [src, setSrc] = useState(null);
  const [broken, setBroken] = useState(false);

  const url = claim?.receiptUrl;
  const rawId = claim?.rawId;

  useEffect(() => {
    setBroken(false);
    if (!active || !url) {
      setSrc(null);
      return undefined;
    }
    if (url.startsWith("/") || url.startsWith("http")) {
      setSrc(url);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/api/claims/${rawId}/receipt`)
      .then((r) => {
        if (!cancelled) setSrc(r?.data?.viewUrl || null);
      })
      .catch(() => {
        // A receipt that cannot be resolved is reported as missing rather than
        // retried: the caller shows "preview unavailable", which is the honest
        // state and the one that tells an approver not to tick fields off.
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [active, url, rawId]);

  return { src, broken, markBroken: () => setBroken(true) };
}
