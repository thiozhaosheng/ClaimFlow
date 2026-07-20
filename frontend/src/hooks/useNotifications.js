import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../utils/api.js";
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
    
    // Connect to SSE for live notifications
    const eventSource = new EventSource(`/api/notifications/live?token=${session.token}`);
    
    eventSource.onmessage = (event) => {
      // Refresh the notification list when we get a push
      refresh();
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error", error);
      eventSource.close();
      // We could implement retry logic here, but for simplicity let refresh() handle manual syncs
    };

    return () => {
      mountedRef.current = false;
      eventSource.close();
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
