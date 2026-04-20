import { supabase } from "./supabase";

// =============================================================================
// Admin metrics — query aggregate per la dashboard /admin-console.
// Tutte le funzioni tornano Promise<{...}>; errori vengono loggati e
// restituiscono valori vuoti così la UI non si rompe.
// Richiede che l'utente abbia profiles.role='admin' e che siano applicate le
// policy RLS in supabase/admin.sql.
// =============================================================================

const VALID_PLANS = ["free", "start", "pro"];

export async function updateCreatorPlan(userId, plan) {
  if (!VALID_PLANS.includes(plan)) throw new Error("Piano non valido");
  const { error } = await supabase
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDayIso = (daysAgo = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() - daysAgo * DAY_MS);
  return d.toISOString();
};

const dayKey = (iso) => {
  if (!iso) return "";
  return iso.slice(0, 10);
};

const buildDayRange = (days) => {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setTime(d.getTime() - i * DAY_MS);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
};

const warn = (label, error) => {
  if (error) console.warn(`[adminMetrics] ${label}:`, error.message || error);
};

// ---------------------------------------------------------------------------
// 1. Overview — conteggi utenti / ruoli / onboarded
// ---------------------------------------------------------------------------
export async function fetchUsersOverview() {
  const [total, creators, fans, admins, onboarded, last24h] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "creator"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "fan"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_complete", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startOfDayIso(1)),
  ]);
  [total, creators, fans, admins, onboarded, last24h].forEach((r) => warn("usersOverview", r.error));
  return {
    total: total.count ?? 0,
    creators: creators.count ?? 0,
    fans: fans.count ?? 0,
    admins: admins.count ?? 0,
    onboarded: onboarded.count ?? 0,
    last24h: last24h.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 2. Signup timeseries — profili per giorno (ultimi N giorni)
// ---------------------------------------------------------------------------
export async function fetchSignupTimeseries(days = 30) {
  const since = startOfDayIso(days - 1);
  const { data, error } = await supabase
    .from("profiles")
    .select("created_at, role")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  warn("signupTimeseries", error);
  const bucket = {};
  for (const key of buildDayRange(days)) bucket[key] = { date: key, fan: 0, creator: 0, admin: 0, total: 0 };
  for (const row of data || []) {
    const key = dayKey(row.created_at);
    if (!bucket[key]) continue;
    const role = row.role || "fan";
    bucket[key][role] = (bucket[key][role] || 0) + 1;
    bucket[key].total += 1;
  }
  return Object.values(bucket);
}

// ---------------------------------------------------------------------------
// 3. Token economy — saldi aggregati + totali per tipo transazione
// ---------------------------------------------------------------------------
export async function fetchTokenEconomy() {
  const { data: wallets, error: wErr } = await supabase
    .from("token_wallets")
    .select("wallet_type, balance, total_earned, total_spent");
  warn("tokenEconomy.wallets", wErr);

  const init = { balance: 0, earned: 0, spent: 0 };
  const totals = { user: { ...init }, creator: { ...init } };
  for (const w of wallets || []) {
    const t = w.wallet_type === "creator" ? "creator" : "user";
    totals[t].balance += w.balance || 0;
    totals[t].earned += w.total_earned || 0;
    totals[t].spent += w.total_spent || 0;
  }

  const { data: tx, error: txErr } = await supabase
    .from("token_transactions")
    .select("type, amount");
  warn("tokenEconomy.tx", txErr);

  const byType = { topup: 0, spend: 0, earn: 0, refund: 0, payout: 0 };
  for (const t of tx || []) {
    if (byType[t.type] === undefined) continue;
    byType[t.type] += Math.abs(t.amount || 0);
  }

  return {
    circulating: totals.user.balance + totals.creator.balance,
    userBalance: totals.user.balance,
    creatorBalance: totals.creator.balance,
    totalEarned: totals.user.earned + totals.creator.earned,
    totalSpent: totals.user.spent + totals.creator.spent,
    tx: byType,
  };
}

// ---------------------------------------------------------------------------
// 4. Token flow timeseries — volume per giorno per tipo
// ---------------------------------------------------------------------------
export async function fetchTokenFlowTimeseries(days = 30) {
  const since = startOfDayIso(days - 1);
  const { data, error } = await supabase
    .from("token_transactions")
    .select("created_at, type, amount")
    .gte("created_at", since);
  warn("tokenFlowTimeseries", error);
  const bucket = {};
  for (const key of buildDayRange(days)) bucket[key] = { date: key, topup: 0, spend: 0, earn: 0, payout: 0 };
  for (const row of data || []) {
    const key = dayKey(row.created_at);
    if (!bucket[key]) continue;
    const v = Math.abs(row.amount || 0);
    if (row.type in bucket[key]) bucket[key][row.type] += v;
  }
  return Object.values(bucket);
}

// ---------------------------------------------------------------------------
// 5. Spend breakdown — categoria da ref_id / description
// ---------------------------------------------------------------------------
export async function fetchSpendBreakdown() {
  const { data, error } = await supabase
    .from("token_transactions")
    .select("amount, description, ref_id")
    .eq("type", "spend");
  warn("spendBreakdown", error);

  const cats = { live: 0, donation: 0, subscription: 0, other: 0 };
  for (const row of data || []) {
    const v = Math.abs(row.amount || 0);
    const ref = (row.ref_id || "").toLowerCase();
    const desc = (row.description || "").toLowerCase();
    if (ref.startsWith("live:") || desc.includes("live")) cats.live += v;
    else if (desc.includes("donazione") || desc.includes("donation")) cats.donation += v;
    else if (ref.startsWith("sub:") || desc.includes("abbon")) cats.subscription += v;
    else cats.other += v;
  }
  return cats;
}

// ---------------------------------------------------------------------------
// 6. Payouts — aggregate per status + totale euro
// ---------------------------------------------------------------------------
export async function fetchPayoutsOverview() {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("status, token_amount, euro_amount, created_at");
  warn("payoutsOverview", error);
  const byStatus = { pending: 0, processing: 0, paid: 0, rejected: 0 };
  let totalEuroPaid = 0;
  let totalTokenPaid = 0;
  for (const p of data || []) {
    if (byStatus[p.status] !== undefined) byStatus[p.status] += 1;
    if (p.status === "paid") {
      totalEuroPaid += Number(p.euro_amount || 0);
      totalTokenPaid += p.token_amount || 0;
    }
  }
  return { byStatus, totalEuroPaid, totalTokenPaid, total: (data || []).length };
}

export async function fetchPayoutRequests() {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*, profiles!payout_requests_creator_id_fkey(full_name, handle, email, payout_method)")
    .order("created_at", { ascending: false })
    .limit(50);
  warn("payoutRequests", error);
  return data || [];
}

// ---------------------------------------------------------------------------
// 7. Engagement — aggregate da content_behaviors
// ---------------------------------------------------------------------------
export async function fetchEngagement() {
  const { data, error } = await supabase
    .from("content_behaviors")
    .select("views, likes, dwell_ms");
  warn("engagement", error);
  let views = 0, likes = 0, dwellMs = 0;
  for (const r of data || []) {
    views += r.views || 0;
    likes += r.likes || 0;
    dwellMs += r.dwell_ms || 0;
  }
  return { views, likes, avgDwellSec: views ? Math.round(dwellMs / views / 1000) : 0, sessions: (data || []).length };
}

// ---------------------------------------------------------------------------
// 8. Top creator / top fan (via wallet totals)
// ---------------------------------------------------------------------------
export async function fetchTopCreators(limit = 10) {
  const { data, error } = await supabase
    .from("token_wallets")
    .select("user_id, total_earned, balance")
    .eq("wallet_type", "creator")
    .order("total_earned", { ascending: false })
    .limit(limit);
  warn("topCreators", error);
  const rows = data || [];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, handle, avatar_url")
    .in("id", ids);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    user_id: r.user_id,
    total_earned: r.total_earned || 0,
    balance: r.balance || 0,
    profile: byId[r.user_id] || null,
  }));
}

export async function fetchTopFans(limit = 10) {
  const { data, error } = await supabase
    .from("token_wallets")
    .select("user_id, total_spent, balance")
    .eq("wallet_type", "user")
    .order("total_spent", { ascending: false })
    .limit(limit);
  warn("topFans", error);
  const rows = (data || []).filter((r) => (r.total_spent || 0) > 0);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, handle, avatar_url")
    .in("id", ids);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    user_id: r.user_id,
    total_spent: r.total_spent || 0,
    balance: r.balance || 0,
    profile: byId[r.user_id] || null,
  }));
}

// ---------------------------------------------------------------------------
// 9. Recent signups — per tabella "ultimi registrati"
// ---------------------------------------------------------------------------
export async function fetchRecentSignups(limit = 20) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, plan, status, onboarding_complete, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  warn("recentSignups", error);
  return data || [];
}

// ---------------------------------------------------------------------------
// 10. Live access stats — da token_transactions.ref_id LIKE 'live:%'
// ---------------------------------------------------------------------------
export async function fetchLiveAccessStats() {
  const { data, error } = await supabase
    .from("token_transactions")
    .select("amount, ref_id, created_at")
    .eq("type", "spend")
    .like("ref_id", "live:%");
  warn("liveAccessStats", error);
  const byLive = {};
  let totalTokens = 0;
  for (const row of data || []) {
    const id = (row.ref_id || "").replace(/^live:/, "");
    const v = Math.abs(row.amount || 0);
    totalTokens += v;
    if (!byLive[id]) byLive[id] = { liveId: id, purchases: 0, tokens: 0 };
    byLive[id].purchases += 1;
    byLive[id].tokens += v;
  }
  return {
    totalPurchases: (data || []).length,
    totalTokens,
    byLive: Object.values(byLive).sort((a, b) => b.tokens - a.tokens),
  };
}
