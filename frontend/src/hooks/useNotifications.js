import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_BASE, getToken } from "../utils/api.js";
import { useAuth } from "../context/authcontext.jsx";

const POLL_INTERVAL_MS = 25_000;

export function useNotifications() {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const result = await api.get("/api/notifications/my");
      if (!mountedRef.current) return;
      setItems(result?.data?.items || []);
      setUnread(result?.data?.unread ?? 0);
      setError(null);
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    if (!session) return () => undefined;

    // Two channels, deliberately redundant:
    //
    //  - SSE is the push channel. The URL needs the /api prefix (the old
    //    "/notifications/live" fell through to the SPA fallback and streamed
    //    index.html) and the token comes from getToken() — the session object
    //    never carried one, so this connected as ?token=undefined and 401'd.
    //    EventSource cannot set an Authorization header, which is why the
    //    backend's protect() accepts ?token= for this route.
    //  - The 25s poll is the safety net. It was defined here and never used,
    //    so when the stream was down nothing refreshed. Push makes it feel
    //    instant; polling guarantees it is never more than 25s stale.
    const token = getToken();
    let eventSource = null;
    let sseFailures = 0;
    if (token && typeof EventSource !== "undefined") {
      eventSource = new EventSource(
        `${API_BASE}/api/notifications/live?token=${encodeURIComponent(token)}`,
      );
      eventSource.onmessage = () => {
        sseFailures = 0;
        refresh();
      };
      // The browser reconnects on transient errors by itself. Only give up
      // when it fails repeatedly (bad token, misconfigured proxy) — the poll
      // keeps notifications flowing either way, without console spam.
      eventSource.onerror = () => {
        sseFailures += 1;
        if (sseFailures >= 3 && eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    }

    const pollId = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(pollId);
      if (eventSource) eventSource.close();
    };
  }, [refresh, session]);

  const markRead = useCallback(
    async (id) => {
      try {
        await api.patch(`/api/notifications/${id}/read`, {});
      } catch {
        /* swallow — refresh will reconcile */
      }
      refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/api/notifications/read-all", {});
    } catch {
      /* swallow */
    }
    refresh();
  }, [refresh]);

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}
