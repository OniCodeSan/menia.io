import { supabase, hasSupabase } from "./supabase";

export async function fetchCreatorMetrics(userId) {
  const empty = {
    revenue: 0,
    revenueTrend: null,
    activeFans: 0,
    fansTrend: null,
    conversionRate: 0,
    conversionTrend: null,
    newSubs: 0,
    newSubsTrend: null,
    revenueChart: [],
    funnel: [
      { stage: "Visitatori", count: 0, color: "bg-muted-foreground" },
      { stage: "Free Fan", count: 0, color: "bg-accent" },
      { stage: "Trial", count: 0, color: "bg-chart-4" },
      { stage: "Abbonati", count: 0, color: "bg-primary" },
      { stage: "Premium", count: 0, color: "bg-chart-3" },
    ],
    topFans: [],
    hasData: false,
  };

  if (!userId || !hasSupabase) return empty;

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [subsRes, newSubsRes, prevSubsRes, earningsRes, topFansRes, postsRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, tier, status", { count: "exact", head: true })
        .eq("creator_id", userId)
        .eq("status", "active"),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .gte("started_at", thisMonth),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .gte("started_at", lastMonth)
        .lte("started_at", lastMonthEnd),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("user_id", userId)
        .in("type", ["earning", "earn"])
        .order("created_date", { ascending: false })
        .limit(500),
      supabase
        .from("subscriptions")
        .select("fan_id, tier, status, started_at, profiles!subscriptions_fan_id_fkey(full_name, handle, avatar_url)")
        .eq("creator_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: true })
        .limit(10),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId),
    ]);

    const activeFans = subsRes.count || 0;
    const newSubs = newSubsRes.count || 0;
    const prevSubs = prevSubsRes.count || 0;

    const totalEarnings = (earningsRes.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const newSubsTrend = prevSubs > 0
      ? `${newSubs >= prevSubs ? "+" : ""}${Math.round(((newSubs - prevSubs) / prevSubs) * 100)}%`
      : newSubs > 0 ? "+100%" : null;

    const premiumCount = (topFansRes.data || []).filter((s) => s.tier === "premium").length;
    const baseCount = activeFans - premiumCount;

    const topFans = (topFansRes.data || []).map((s) => {
      const p = s.profiles || {};
      return {
        name: p.full_name || "Fan",
        email: `@${p.handle || "fan"}`,
        avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "F")}&background=7c3aed&color=fff&size=80`,
        status: s.tier === "premium" ? "Premium" : "Abbonato",
        spent: s.tier === "premium" ? "200 T/m" : "100 T/m",
      };
    });

    const hasData = activeFans > 0 || totalEarnings > 0 || (postsRes.count || 0) > 0;

    return {
      revenue: totalEarnings,
      revenueTrend: null,
      activeFans,
      fansTrend: null,
      conversionRate: 0,
      conversionTrend: null,
      newSubs,
      newSubsTrend: newSubsTrend,
      revenueChart: [],
      funnel: [
        { stage: "Visitatori", count: 0, color: "bg-muted-foreground" },
        { stage: "Free Fan", count: 0, color: "bg-accent" },
        { stage: "Trial", count: 0, color: "bg-chart-4" },
        { stage: "Abbonati", count: baseCount, color: "bg-primary" },
        { stage: "Premium", count: premiumCount, color: "bg-chart-3" },
      ],
      topFans,
      hasData,
    };
  } catch (e) {
    console.warn("[creatorMetrics]", e.message);
    return empty;
  }
}
