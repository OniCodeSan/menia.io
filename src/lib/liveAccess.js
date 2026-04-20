import { supabase, hasSupabase } from "./supabase";
import { canCreatorUse, getLiveLimit } from "./plans";

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
}

export async function getMonthlyLiveUsage(creatorId) {
  if (!hasSupabase || !creatorId) return { used: 0, limit: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role")
    .eq("id", creatorId)
    .maybeSingle();

  const plan = profile?.plan || "free";
  const role = profile?.role || "fan";
  const limit = getLiveLimit(plan, role);

  if (limit === null) return { used: 0, limit: null, plan, role };

  const { start, end } = monthBounds();
  const { count, error } = await supabase
    .from("live_sessions")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) console.warn("[liveAccess] count error:", error.message);

  return { used: count || 0, limit, plan, role };
}

export async function canCreatorStartLive(creatorId, role) {
  if (!hasSupabase || !creatorId) {
    return { allowed: false, reason: "Servizio non disponibile" };
  }

  const { used, limit, plan, role: dbRole } = await getMonthlyLiveUsage(creatorId);
  const effectiveRole = role || dbRole;

  if (!canCreatorUse("go_live", plan, effectiveRole)) {
    return {
      allowed: false,
      reason: "Il tuo piano non include le dirette live.",
      used,
      limit,
      plan,
    };
  }

  if (limit !== null && used >= limit) {
    return {
      allowed: false,
      reason: `Hai esaurito le ${limit} live mensili del piano ${plan.toUpperCase()}. Passa a PRO per live illimitate.`,
      used,
      limit,
      plan,
    };
  }

  return { allowed: true, used, limit, plan };
}
