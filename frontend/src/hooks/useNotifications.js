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
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
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
