import { supabase } from "./supabase";

// =============================================================================
// Moderation — report submission + admin queries.
// Richiede tabella user_reports e colonna profiles.status (supabase/moderation.sql).
// =============================================================================

export const REPORT_REASONS = [
  { key: "spam", label: "Spam o pubblicità indesiderata" },
  { key: "harassment", label: "Molestie, odio o bullismo" },
  { key: "scam", label: "Truffa o frode" },
  { key: "inappropriate", label: "Contenuti inappropriati o illegali" },
  { key: "impersonation", label: "Furto d'identità" },
  { key: "other", label: "Altro" },
];

export const USER_STATUS = [
  { key: "active", label: "Attivo", tone: "ok" },
  { key: "warned", label: "Avvertito", tone: "warn" },
  { key: "suspended", label: "Sospeso", tone: "danger" },
  { key: "banned", label: "Bannato", tone: "danger" },
];

export async function submitReport({
  reporterId,
  targetId,
  targetRole = "creator",
  reason,
  description = "",
  contextType = null,
  contextId = null,
}) {
  if (!reporterId) throw new Error("Devi essere loggato per segnalare");
  if (!targetId) throw new Error("Utente non valido");
  if (reporterId === targetId) throw new Error("Non puoi segnalare te stesso");
  if (!REPORT_REASONS.find((r) => r.key === reason)) throw new Error("Motivo non valido");

  const { data, error } = await supabase
    .from("user_reports")
    .insert({
      reporter_id: reporterId,
      target_id: targetId,
      target_role: targetRole,
      reason,
      description: description.trim() || null,
      context_type: contextType,
      context_id: contextId,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------
export async function fetchReports({ status = "pending", limit = 100 } = {}) {
  let q = supabase
    .from("user_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.warn("[moderation] fetchReports:", error.message);
    return [];
  }
  const rows = data || [];
  if (!rows.length) return [];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.reporter_id, r.target_id, r.resolved_by].filter(Boolean))));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, handle, role, status, avatar_url")
    .in("id", ids);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    reporter: byId[r.reporter_id] || null,
    target: byId[r.target_id] || null,
    resolver: r.resolved_by ? byId[r.resolved_by] || null : null,
  }));
}

export async function fetchReportsOverview() {
  const [pending, resolved, dismissed] = await Promise.all([
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "dismissed"),
  ]);
  return {
    pending: pending.count ?? 0,
    resolved: resolved.count ?? 0,
    dismissed: dismissed.count ?? 0,
  };
}

export async function updateReportStatus(reportId, { status, actionTaken = null }) {
  const { data: session } = await supabase.auth.getUser();
  const adminId = session?.user?.id;
  const { data, error } = await supabase
    .from("user_reports")
    .update({
      status,
      action_taken: actionTaken,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateUserStatus(userId, status) {
  if (!USER_STATUS.find((s) => s.key === status)) throw new Error("Status non valido");
  const { data, error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
