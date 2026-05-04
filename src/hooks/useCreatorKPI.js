import { useEffect, useState, useCallback } from "react";
import { kpiApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Retry singolo su 503 con backoff 600ms (Cloudflare/edge node sporadici).
async function withRetry503(buildQuery) {
  const r1 = await buildQuery();
  if (r1.status !== 503) return r1;
  await new Promise((res) => setTimeout(res, 600));
  return buildQuery();
}

// Unified hook that fetches everything the creator dashboard needs and exposes
// a clean shape: { kpi, courses, lives, suggestions, conversion, communityStats }.
// Single `refresh()` call for after-edit refetches.
export default function useCreatorKPI(userId) {
  const [data, setData] = useState({
    kpi: null,
    conversion: null,
    suggestions: [],
    courses: [],
    lives: [],
    communityStats: { posts: 0, subscribers: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [k, c, n, coursesRes, livesRes, postsRes, subsRes] = await Promise.all([
        kpiApi.get().catch(() => null),
        kpiApi.conversion().catch(() => null),
        kpiApi.suggestions().catch(() => ({ nudges: [] })),
        supabase.from("courses").select("*").eq("creator_id", userId).order("created_at", { ascending: false }),
        supabase.from("live_events").select("*").eq("creator_id", userId).order("scheduled_at", { ascending: true }),
        withRetry503(() => supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("creator_id", userId)),
        withRetry503(() => supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("creator_id", userId).eq("status", "active")),
      ]);
      setData({
        kpi: k,
        conversion: c,
        suggestions: n?.nudges || [],
        courses: coursesRes.data || [],
        lives: livesRes.data || [],
        communityStats: { posts: postsRes.count || 0, subscribers: subsRes.count || 0 },
      });
    } catch (err) {
      console.error("[useCreatorKPI]", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
