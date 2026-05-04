// =============================================================================
// Notifications — feed personale dell'utente loggato.
// Tabella `notifications` riusata. Tipi noti: 'broadcast', 'system'.
// =============================================================================

const express = require("express");
const access = require("./access");

module.exports = function createNotificationsRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  router.get("/me", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const before = req.query.before;

    let query = supabase
      .from("notifications")
      .select("id, type, title, body, ref_id, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) // tiebreaker stabile
      .limit(limit);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) {
      console.error("[notifications:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento notifiche" });
    }
    return res.json({ notifications: data || [] });
  });

  router.get("/unread-count", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { count, error } = await supabase
      .from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("read", false);
    if (error) {
      console.error("[notifications:unread]", error.message);
      return res.status(500).json({ error: "Errore conteggio" });
    }
    return res.json({ count: count || 0 });
  });

  router.post("/:id/read", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });
    const { data, error } = await supabase.from("notifications")
      .update({ read: true }).eq("id", id).eq("user_id", user.id)
      .select("id").maybeSingle();
    if (error) {
      console.error("[notifications:mark-read]", error.message);
      return res.status(500).json({ error: "Errore aggiornamento" });
    }
    if (!data) return res.status(404).json({ error: "Notifica non trovata" });
    return res.json({ ok: true });
  });

  router.post("/mark-all-read", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { data: ids, error: selErr } = await supabase
      .from("notifications").select("id")
      .eq("user_id", user.id).eq("read", false).limit(5000);
    if (selErr) {
      console.error("[notifications:mark-all-read:select]", selErr.message);
      return res.status(500).json({ error: "Errore aggiornamento" });
    }
    if (!ids?.length) return res.json({ ok: true, updated: 0 });
    const { error } = await supabase.from("notifications")
      .update({ read: true })
      .in("id", ids.map((r) => r.id))
      .eq("user_id", user.id);
    if (error) {
      console.error("[notifications:mark-all-read:update]", error.message);
      return res.status(500).json({ error: "Errore aggiornamento" });
    }
    return res.json({ ok: true, updated: ids.length });
  });

  return router;
};
