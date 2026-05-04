import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { notificationsApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const POLLING_INTERVAL_MS = 60_000;
const SAFETY_SYNC_MS = 120_000;
const MAX_BADGE = 99;

export default function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);
  const safetySyncRef = useRef(null);
  const channelRef = useRef(null);
  const refreshRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const clampCount = (n) => Math.max(0, n);

  const refresh = useCallback(async () => {
    if (!userId) return;
    // Coalesce rapid-fire calls (focus/visibility/realtime resubscribe can fire in bursts)
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 5000) return;
    lastRefreshAtRef.current = now;
    setLoading(true);
    try {
      const [listRes, cntRes] = await Promise.all([
        notificationsApi.list({ limit: 30 }),
        notificationsApi.unreadCount(),
      ]);
      setItems(listRes.notifications || []);
      setCount(clampCount(cntRes.count || 0));
    } catch (e) {
      console.warn("[notifications:refresh]", e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Keep a stable ref so timers/listeners always call the latest refresh without
  // forcing the main effect to re-run.
  refreshRef.current = refresh;

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => refreshRef.current?.(), POLLING_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]); setCount(0);
      stopPolling();
      if (safetySyncRef.current) { clearInterval(safetySyncRef.current); safetySyncRef.current = null; }
      return;
    }
    refreshRef.current?.();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new;
          setItems((prev) => {
            if (prev.some((x) => x.id === n.id)) return prev;
            return [n, ...prev].slice(0, 30);
          });
          if (!n.read) setCount((c) => clampCount(c + 1));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          stopPolling();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          startPolling();
        }
      });
    channelRef.current = channel;

    safetySyncRef.current = setInterval(async () => {
      try {
        const r = await notificationsApi.unreadCount();
        setCount(clampCount(r.count || 0));
      } catch {}
    }, SAFETY_SYNC_MS);

    const onFocus = () => refreshRef.current?.();
    const onVisibility = () => { if (document.visibilityState === "visible") refreshRef.current?.(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      stopPolling();
      if (safetySyncRef.current) { clearInterval(safetySyncRef.current); safetySyncRef.current = null; }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, startPolling, stopPolling]);

  const markAsRead = useCallback(async (id) => {
    let wasUnread = false;
    setItems((prev) => prev.map((n) => {
      if (n.id === id && !n.read) { wasUnread = true; return { ...n, read: true }; }
      return n;
    }));
    if (wasUnread) setCount((c) => clampCount(c - 1));
    try {
      await notificationsApi.markRead(id);
    } catch (e) {
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
      if (wasUnread) setCount((c) => clampCount(c + 1));
      console.warn("[notifications:mark-read]", e.message);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prevItems = items;
    const prevCount = count;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch (e) {
      setItems(prevItems); setCount(prevCount);
      console.warn("[notifications:mark-all-read]", e.message);
    }
  }, [items, count]);

  const badge = count > MAX_BADGE ? `${MAX_BADGE}+` : (count > 0 ? String(count) : null);
  return { items, count, badge, loading, refresh, markAsRead, markAllRead };
}
