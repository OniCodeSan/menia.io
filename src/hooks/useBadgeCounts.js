import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

// Hook condiviso per badge nav/sidebar.
// Ritorna conteggi che cambiano raramente — fetched una volta al mount,
// più refresh manuale via effect quando l'user cambia. Niente polling
// (costoso e poco utile per badge non-real-time).
//
// Ritorna:
//   { unreadMessages, newFollowers7d, loading, refresh }
//
// Tutti i count clamped a 0 in caso di errore (soft-fail).
export default function useBadgeCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ unreadMessages: 0, newFollowers7d: 0 });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    Promise.all([
      // Unread direct messages received by me
      supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false),

      // Nuovi follower negli ultimi 7gg (solo per creator)
      user.role === "creator" || user.role === "admin"
        ? supabase
            .from("follows")
            .select("fan_id", { count: "exact", head: true })
            .eq("creator_id", user.id)
            .gte("created_at", sevenDaysAgo)
        : Promise.resolve({ count: 0 }),
    ]).then(([msgRes, followRes]) => {
      if (cancelled) return;
      setCounts({
        unreadMessages: msgRes?.count || 0,
        newFollowers7d: followRes?.count || 0,
      });
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id, user?.role, tick]);

  return {
    ...counts,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}
