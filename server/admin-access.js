// =============================================================================
// Admin Access Grants — admin-only endpoints to grant course/live access
// after an external payment has been confirmed (manual or webhook).
// All routes require an admin-role JWT (service-role flow happens server-side).
// =============================================================================

const express = require("express");
const access = require("./access");
const emails = require("./emails");

const ALLOWED_SOURCES = ["manual", "external_payment", "webhook"];

module.exports = function createAdminAccessRouter({ supabase, requireAdminJWT }) {
  const router = express.Router();

  // Auth gate — every route requires admin
  router.use(async (req, res, next) => {
    const admin = await requireAdminJWT(req);
    if (!admin) return res.status(403).json({ error: "Admin richiesto" });
    req.admin = admin;
    next();
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/grant-course-access
  // body: { user_id, course_id, source?, external_reference? }
  // ---------------------------------------------------------------------------
  router.post("/grant-course-access", async (req, res) => {
    const { user_id, course_id, source = "manual", external_reference } = req.body || {};

    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(course_id)) return res.status(400).json({ error: "course_id non valido" });
    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ error: `source deve essere ${ALLOWED_SOURCES.join("|")}` });
    }
    if (external_reference !== undefined && external_reference !== null) {
      if (typeof external_reference !== "string" || external_reference.length > 255) {
        return res.status(400).json({ error: "external_reference non valido (max 255)" });
      }
    }

    // Verify both user and course exist (clearer 404 than FK error)
    const [{ data: u }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("id").eq("id", user_id).maybeSingle(),
      supabase.from("courses").select("id, creator_id, title").eq("id", course_id).maybeSingle(),
    ]);
    if (!u) return res.status(404).json({ error: "Utente non trovato" });
    if (!c) return res.status(404).json({ error: "Corso non trovato" });

    const { data, error } = await supabase
      .from("course_access")
      .upsert({
        user_id,
        course_id,
        granted_by: req.admin.id,
        source,
        external_reference: external_reference || null,
        granted_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[admin:grant-course-access]", error.message);
      return res.status(500).json({ error: "Errore concessione accesso" });
    }

    console.log(`[admin] course access granted: user=${user_id} course=${course_id} source=${source} by=${req.admin.id}`);

    // Notifica formatore: nuovo studente nel suo corso (soft-fail)
    (async () => {
      try {
        const [{ data: creator }, { data: studentProfile }, { data: creatorAuth }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", c.creator_id).maybeSingle(),
          supabase.from("profiles").select("full_name").eq("id", user_id).maybeSingle(),
          supabase.auth.admin.getUserById(c.creator_id),
        ]);
        const creatorEmail = creatorAuth?.user?.email;
        if (creatorEmail) {
          await emails.sendNewStudent({
            email: creatorEmail,
            name: creator?.full_name || "",
            student_name: studentProfile?.full_name || "Uno studente",
            course_title: c.title || "il tuo corso",
            course_id: course_id,
          });
        }
      } catch (e) {
        console.warn("[admin:grant-course-access:email]", e.message);
      }
    })();

    return res.json({ access: data });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/revoke-course-access
  // body: { user_id, course_id }
  // ---------------------------------------------------------------------------
  router.post("/revoke-course-access", async (req, res) => {
    const { user_id, course_id } = req.body || {};
    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(course_id)) return res.status(400).json({ error: "course_id non valido" });

    const { error } = await supabase
      .from("course_access")
      .delete()
      .eq("user_id", user_id)
      .eq("course_id", course_id);
    if (error) {
      console.error("[admin:revoke-course-access]", error.message);
      return res.status(500).json({ error: "Errore revoca accesso" });
    }
    console.log(`[admin] course access revoked: user=${user_id} course=${course_id} by=${req.admin.id}`);
    return res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/grant-live-access
  // body: { user_id, live_event_id, source?, external_reference? }
  // ---------------------------------------------------------------------------
  router.post("/grant-live-access", async (req, res) => {
    const { user_id, live_event_id, source = "manual", external_reference } = req.body || {};

    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(live_event_id)) return res.status(400).json({ error: "live_event_id non valido" });
    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ error: `source deve essere ${ALLOWED_SOURCES.join("|")}` });
    }
    if (external_reference !== undefined && external_reference !== null) {
      if (typeof external_reference !== "string" || external_reference.length > 255) {
        return res.status(400).json({ error: "external_reference non valido (max 255)" });
      }
    }

    const [{ data: u }, { data: e }] = await Promise.all([
      supabase.from("profiles").select("id").eq("id", user_id).maybeSingle(),
      supabase.from("live_events").select("id, creator_id, title").eq("id", live_event_id).maybeSingle(),
    ]);
    if (!u) return res.status(404).json({ error: "Utente non trovato" });
    if (!e) return res.status(404).json({ error: "Live non trovata" });

    const { data, error } = await supabase
      .from("live_access")
      .upsert({
        user_id,
        live_event_id,
        granted_by: req.admin.id,
        source,
        external_reference: external_reference || null,
        granted_at: new Date().toISOString(),
      }, { onConflict: "user_id,live_event_id" })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[admin:grant-live-access]", error.message);
      return res.status(500).json({ error: "Errore concessione accesso" });
    }
    console.log(`[admin] live access granted: user=${user_id} live=${live_event_id} source=${source} by=${req.admin.id}`);
    return res.json({ access: data });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/revoke-live-access
  // body: { user_id, live_event_id }
  // ---------------------------------------------------------------------------
  router.post("/revoke-live-access", async (req, res) => {
    const { user_id, live_event_id } = req.body || {};
    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(live_event_id)) return res.status(400).json({ error: "live_event_id non valido" });

    const { error } = await supabase
      .from("live_access")
      .delete()
      .eq("user_id", user_id)
      .eq("live_event_id", live_event_id);
    if (error) {
      console.error("[admin:revoke-live-access]", error.message);
      return res.status(500).json({ error: "Errore revoca accesso" });
    }
    console.log(`[admin] live access revoked: user=${user_id} live=${live_event_id} by=${req.admin.id}`);
    return res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/grant-subscription
  // body: { user_id, creator_id, expires_at?, source?, external_reference? }
  // Single-tier monthly subscription. Idempotent: existing subscription is
  // updated (status=active, expires_at refreshed).
  // ---------------------------------------------------------------------------
  router.post("/grant-subscription", async (req, res) => {
    const { user_id, creator_id, expires_at, source = "manual", external_reference } = req.body || {};

    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(creator_id)) return res.status(400).json({ error: "creator_id non valido" });
    if (user_id === creator_id) return res.status(400).json({ error: "user_id e creator_id devono essere diversi" });
    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ error: `source deve essere ${ALLOWED_SOURCES.join("|")}` });
    }
    let expIso = null;
    if (expires_at) {
      const t = new Date(expires_at).getTime();
      if (Number.isNaN(t)) return res.status(400).json({ error: "expires_at non valido" });
      if (t <= Date.now()) return res.status(400).json({ error: "expires_at deve essere nel futuro" });
      expIso = new Date(t).toISOString();
    } else {
      // Default: +30 days from now
      expIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Verify both users exist
    const [{ data: u }, { data: cr }] = await Promise.all([
      supabase.from("profiles").select("id").eq("id", user_id).maybeSingle(),
      supabase.from("profiles").select("id, role").eq("id", creator_id).maybeSingle(),
    ]);
    if (!u) return res.status(404).json({ error: "Utente non trovato" });
    if (!cr) return res.status(404).json({ error: "Creator non trovato" });

    const nowIso = new Date().toISOString();

    // Look for any existing subscription for this fan/creator pair
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("fan_id", user_id)
      .eq("creator_id", creator_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: expIso,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[admin:grant-subscription:update]", error.message);
        return res.status(500).json({ error: "Errore aggiornamento subscription" });
      }
      result = data;
    } else {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          fan_id: user_id,
          creator_id,
          status: "active",
          started_at: nowIso,
          expires_at: expIso,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[admin:grant-subscription:insert]", error.message);
        return res.status(500).json({ error: "Errore creazione subscription" });
      }
      result = data;
    }

    console.log(`[admin] subscription granted: fan=${user_id} creator=${creator_id} expires=${expIso} source=${source} by=${req.admin.id}`);
    return res.json({ subscription: result });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/revoke-subscription
  // body: { user_id, creator_id }
  // Soft revoke: mark subscription as 'cancelled' without deleting history.
  // ---------------------------------------------------------------------------
  router.post("/revoke-subscription", async (req, res) => {
    const { user_id, creator_id } = req.body || {};
    if (!access.isUuid(user_id)) return res.status(400).json({ error: "user_id non valido" });
    if (!access.isUuid(creator_id)) return res.status(400).json({ error: "creator_id non valido" });

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("fan_id", user_id)
      .eq("creator_id", creator_id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin:revoke-subscription]", error.message);
      return res.status(500).json({ error: "Errore revoca subscription" });
    }
    console.log(`[admin] subscription revoked: fan=${user_id} creator=${creator_id} by=${req.admin.id}`);
    return res.json({ subscription: data, revoked: !!data });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/grant-creator-plan
  // body: { creator_id, plan_id, expires_at?, external_reference? }
  // ---------------------------------------------------------------------------
  router.post("/grant-creator-plan", async (req, res) => {
    const { creator_id, plan_id, expires_at, external_reference } = req.body || {};
    if (!access.isUuid(creator_id)) return res.status(400).json({ error: "creator_id non valido" });
    if (!plan_id || typeof plan_id !== "string") return res.status(400).json({ error: "plan_id richiesto" });

    const { data: plan } = await supabase
      .from("creator_plans")
      .select("id")
      .eq("id", plan_id)
      .maybeSingle();
    if (!plan) return res.status(404).json({ error: "Piano non trovato" });

    let expIso = null;
    if (expires_at) {
      const t = new Date(expires_at).getTime();
      if (Number.isNaN(t)) return res.status(400).json({ error: "expires_at non valido" });
      expIso = new Date(t).toISOString();
    } else {
      expIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: existing } = await supabase
      .from("creator_plan_subscriptions")
      .select("id")
      .eq("creator_id", creator_id)
      .eq("status", "active")
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("creator_plan_subscriptions")
        .update({
          plan_id,
          expires_at: expIso,
          external_reference: external_reference || null,
          granted_by: req.admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[admin:grant-creator-plan:update]", error.message);
        return res.status(500).json({ error: "Errore aggiornamento piano" });
      }
      result = data;
    } else {
      const { data, error } = await supabase
        .from("creator_plan_subscriptions")
        .insert({
          creator_id, plan_id, expires_at: expIso,
          external_reference: external_reference || null,
          granted_by: req.admin.id,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[admin:grant-creator-plan:insert]", error.message);
        return res.status(500).json({ error: "Errore creazione piano" });
      }
      result = data;
    }

    // Trigger KPI recompute for this creator (visibility includes plan_boost)
    try { await supabase.rpc("compute_creator_kpi", { p_creator_id: creator_id }); } catch {}

    console.log(`[admin] creator plan granted: creator=${creator_id} plan=${plan_id} expires=${expIso} by=${req.admin.id}`);
    return res.json({ subscription: result });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/revoke-creator-plan
  // body: { creator_id }
  // ---------------------------------------------------------------------------
  router.post("/revoke-creator-plan", async (req, res) => {
    const { creator_id } = req.body || {};
    if (!access.isUuid(creator_id)) return res.status(400).json({ error: "creator_id non valido" });

    const { data, error } = await supabase
      .from("creator_plan_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("creator_id", creator_id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (error) return res.status(500).json({ error: "Errore revoca" });

    try { await supabase.rpc("compute_creator_kpi", { p_creator_id: creator_id }); } catch {}

    return res.json({ subscription: data, revoked: !!data });
  });

  return router;
};
