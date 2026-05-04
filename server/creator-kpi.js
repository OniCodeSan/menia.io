// =============================================================================
// Creator KPI / Segments / Plans API.
// All numbers are *estimated* (computed from access_logs, not real
// transactions). No internal money handling.
// =============================================================================

const express = require("express");
const access = require("./access");

module.exports = function createKpiRouter({ supabase, requireUserJWT, requireAdminJWT }) {
  const router = express.Router();

  // ---------------------------------------------------------------------------
  // GET /api/creator/kpi — own aggregated KPI + segment + active plan + trend
  // ---------------------------------------------------------------------------
  router.get("/kpi", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const since7d = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [aggRes, segRes, planRes, trendRes, accessRes, topCourseRes] = await Promise.all([
      supabase.from("creator_kpi_aggregated").select("*").eq("creator_id", user.id).maybeSingle(),
      supabase.from("creator_segments").select("*").eq("creator_id", user.id).maybeSingle(),
      supabase
        .from("creator_plan_subscriptions")
        .select("plan_id, started_at, expires_at, status, external_reference, creator_plans(*)")
        .eq("creator_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("creator_kpi_daily")
        .select("date, new_students, profile_views, course_views")
        .eq("creator_id", user.id)
        .gte("date", since7d),
      supabase
        .from("access_logs")
        .select("content_id, content_type, created_at")
        .eq("creator_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from("access_logs")
        .select("content_id, estimated_amount")
        .eq("creator_id", user.id)
        .eq("content_type", "course"),
    ]);

    const trend7d = (trendRes.data || []).reduce((acc, r) => {
      acc.new_students += r.new_students || 0;
      acc.views += (r.profile_views || 0) + (r.course_views || 0);
      return acc;
    }, { new_students: 0, views: 0 });
    trend7d.new_accesses = (accessRes.data || []).filter((r) => r.content_type === "course").length;

    // Compute top course (by access count)
    let topCourse = null;
    const counts = new Map();
    for (const r of topCourseRes.data || []) {
      counts.set(r.content_id, (counts.get(r.content_id) || 0) + 1);
    }
    if (counts.size > 0) {
      const [topId, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const { data: tc } = await supabase
        .from("courses")
        .select("id, title, price")
        .eq("id", topId)
        .maybeSingle();
      if (tc) topCourse = { ...tc, accesses: topCount };
    }

    return res.json({
      aggregated: aggRes.data || {
        creator_id: user.id,
        total_courses: 0, total_students: 0, total_live_attendees: 0,
        total_revenue_estimated: 0, conversion_rate_estimated: 0, visibility_score: 0,
      },
      segment: segRes.data || { segment_type: "starter", score: 0 },
      plan: planRes.data
        ? {
            ...planRes.data.creator_plans,
            expires_at: planRes.data.expires_at,
            started_at: planRes.data.started_at,
            external_reference: planRes.data.external_reference,
          }
        : null,
      trend7d,
      top_course: topCourse,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/creator/kpi/history?days=30 — daily snapshots
  // ---------------------------------------------------------------------------
  router.get("/kpi/history", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("creator_kpi_daily")
      .select("date, profile_views, course_views, live_views, community_views, new_followers, new_students, estimated_revenue")
      .eq("creator_id", user.id)
      .gte("date", since)
      .order("date", { ascending: true });

    if (error) {
      console.error("[kpi/history]", error.message);
      return res.status(500).json({ error: "Errore caricamento storico" });
    }
    return res.json({ days, history: data || [] });
  });

  // ---------------------------------------------------------------------------
  // GET /api/creator/segment — own segment
  // ---------------------------------------------------------------------------
  router.get("/segment", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { data } = await supabase
      .from("creator_segments")
      .select("*")
      .eq("creator_id", user.id)
      .maybeSingle();

    const segment = data || { segment_type: "starter", score: 0 };

    const SUGGESTIONS = {
      starter: [
        "Pubblica il tuo primo corso per attrarre i primi studenti.",
        "Aggiungi una bio dettagliata sul tuo profilo formatore.",
        "Carica un'immagine cover sul corso: i corsi con cover compaiono in homepage.",
      ],
      growing: [
        "Lancia un corso strutturato in più lezioni.",
        "Pubblica un post di community per fidelizzare gli studenti.",
        "Considera il piano Starter (€14,90) per analytics base e visibilità.",
      ],
      pro: [
        "Apri una community privata per i tuoi studenti.",
        "Considera il piano Grow (€29,90) per più corsi e analytics avanzate.",
        "Aumenta il prezzo del corso più richiesto del 20%.",
      ],
      elite: [
        "Hai tanti corsi da proporre? Contattaci per il piano Master.",
        "Crea bundle di corsi a tema.",
        "Invia un broadcast mensile con gli aggiornamenti del corso.",
      ],
    };

    return res.json({
      segment,
      suggestions: SUGGESTIONS[segment.segment_type] || [],
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/creator/conversion — current conversion rate + warning hints
  // ---------------------------------------------------------------------------
  router.get("/conversion", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { data: agg } = await supabase
      .from("creator_kpi_aggregated")
      .select("total_students, total_courses, conversion_rate_estimated")
      .eq("creator_id", user.id)
      .maybeSingle();

    const { data: daily } = await supabase
      .from("creator_kpi_daily")
      .select("course_views, profile_views, new_students")
      .eq("creator_id", user.id)
      .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

    const totalViews = (daily || []).reduce((s, d) => s + (d.course_views || 0) + (d.profile_views || 0), 0);
    const totalStudents = agg?.total_students || 0;
    const rate = totalViews > 0 ? Math.min(totalStudents / totalViews, 1) : (agg?.conversion_rate_estimated || 0);

    let warning = null;
    if (totalViews >= 100 && rate < 0.02) {
      warning = "Hai traffico ma poche conversioni. Rivedi prezzo o descrizione del corso.";
    } else if ((agg?.total_courses || 0) > 0 && totalStudents === 0) {
      warning = "Nessuno studente ancora. Condividi il link del corso sui tuoi canali.";
    } else if ((agg?.total_courses || 0) === 0) {
      warning = "Crea il tuo primo corso per iniziare a misurare le conversioni.";
    }

    return res.json({
      rate,
      total_views: totalViews,
      total_students: totalStudents,
      total_courses: agg?.total_courses || 0,
      warning,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/creator/suggestions — context-aware nudges
  // ---------------------------------------------------------------------------
  router.get("/suggestions", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { data: agg } = await supabase
      .from("creator_kpi_aggregated")
      .select("*")
      .eq("creator_id", user.id)
      .maybeSingle();

    const { data: lastCourse } = await supabase
      .from("courses")
      .select("id, created_at, is_published")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // (live feature disabilitata in UI: skip query lastLive e nudge schedule_live)

    const totalCourses = agg?.total_courses || 0;
    const totalStudents = agg?.total_students || 0;
    const rate = agg?.conversion_rate_estimated || 0;
    const daysSinceLastCourse = lastCourse ? (Date.now() - new Date(lastCourse.created_at).getTime()) / 86400000 : Infinity;

    const nudges = [];
    if (totalCourses === 0) {
      nudges.push({
        type: "first_course",
        priority: 1,
        title: "Crea il tuo primo corso",
        text: "Inizia a costruire il tuo catalogo formativo. Bastano 1 titolo + 1 descrizione + 1 lezione per partire.",
        action: { label: "Crea corso", to: "/dashboard" },
      });
    } else if (totalStudents === 0) {
      nudges.push({
        type: "first_student",
        priority: 1,
        title: "Condividi il link del corso",
        text: "Hai contenuti ma zero studenti: il prossimo passo è portare traffico. Condividi il link sui tuoi canali.",
        action: { label: "Vedi corso", to: lastCourse ? `/courses/${lastCourse.id}` : "/dashboard" },
      });
    } else if (rate < 0.02 && totalStudents < 5) {
      nudges.push({
        type: "low_conversion",
        priority: 1,
        title: "Conversione bassa",
        text: "Pochi accessi rispetto al traffico. Rivedi prezzo, descrizione, o aggiungi una lezione preview.",
        action: { label: "Modifica corso", to: "/dashboard" },
      });
    }
    if (daysSinceLastCourse > 30 && totalCourses > 0) {
      nudges.push({
        type: "publish_more",
        priority: 2,
        title: "Pubblica un nuovo corso",
        text: "Sono passati più di 30 giorni dall'ultimo corso. La freschezza spinge il ranking.",
        action: { label: "Nuovo corso", to: "/dashboard" },
      });
    }
    if (lastCourse && !lastCourse.is_published) {
      nudges.push({
        type: "publish_draft",
        priority: 1,
        title: "Hai un corso in bozza",
        text: "Un corso non pubblicato non è visibile a nessuno. Apri la dashboard e attiva la pubblicazione.",
        action: { label: "Pubblica", to: "/dashboard" },
      });
    }

    nudges.sort((a, b) => a.priority - b.priority);
    return res.json({ nudges: nudges.slice(0, 4) });
  });

  // ---------------------------------------------------------------------------
  // POST /api/creator/views — track a content/profile view
  // body: { kind: 'profile'|'course'|'live'|'community', creator_id, content_id? }
  // No auth required (public visitors count too). Best-effort, failure is silent.
  // ---------------------------------------------------------------------------
  router.post("/views", async (req, res) => {
    const { kind, creator_id } = req.body || {};
    const validKind = ["profile", "course", "live", "community"].includes(kind);
    if (!validKind || !access.isUuid(creator_id)) {
      return res.status(400).json({ error: "kind/creator_id non validi" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const col = `${kind}_views`;

    // Upsert daily row, increment the relevant column
    try {
      const { data: existing } = await supabase
        .from("creator_kpi_daily")
        .select("id, " + col)
        .eq("creator_id", creator_id)
        .eq("date", today)
        .maybeSingle();
      if (existing) {
        const next = (existing[col] || 0) + 1;
        await supabase
          .from("creator_kpi_daily")
          .update({ [col]: next })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("creator_kpi_daily")
          .insert({ creator_id, date: today, [col]: 1 });
      }
    } catch (err) {
      console.warn("[views] write failed:", err.message);
    }
    return res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // POST /api/creator/activate-plan-test { plan_id }
  // Beta-only self-service activation: bypasses external payment so the
  // creator can test plan-gated features (analytics tier, course/live limits,
  // priority visibility). Gated by PRE_LAUNCH_MODE — disabled in production.
  // ---------------------------------------------------------------------------
  router.post("/activate-plan-test", async (req, res) => {
    const preLaunch = String(process.env.PRE_LAUNCH_MODE || "true").toLowerCase() === "true";
    if (!preLaunch) {
      return res.status(403).json({ error: "Attivazione di test disponibile solo in beta" });
    }

    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { plan_id } = req.body || {};
    if (!plan_id || typeof plan_id !== "string") {
      return res.status(400).json({ error: "plan_id richiesto" });
    }

    const { data: plan } = await supabase
      .from("creator_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!plan) return res.status(404).json({ error: "Piano non trovato" });

    const expIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Cancel any existing active sub for this creator (unique-active index forces this)
    await supabase
      .from("creator_plan_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("creator_id", user.id)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("creator_plan_subscriptions")
      .insert({
        creator_id: user.id,
        plan_id,
        expires_at: expIso,
        external_reference: "TEST_MODE",
        granted_by: user.id,
      })
      .select("*, creator_plans(*)")
      .maybeSingle();

    if (error) {
      console.error("[activate-plan-test]", error.message);
      return res.status(500).json({ error: "Errore attivazione piano" });
    }

    try { await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }); } catch {}

    console.log(`[test] creator self-activated plan: creator=${user.id} plan=${plan_id}`);
    return res.json({
      ok: true,
      subscription: data,
      plan: data?.creator_plans || plan,
      test_mode: true,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/creator/subscribe-plan { plan_id }
  // Crea una Stripe Checkout Session per il piano formatore selezionato.
  // Lo stato locale è aggiornato dal webhook (kind=creator_plan).
  // Fallback su external_payment_link se Stripe non è ancora configurato.
  // ---------------------------------------------------------------------------
  const billing = require("./billing");
  router.post("/subscribe-plan", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { plan_id } = req.body || {};
    if (!plan_id || typeof plan_id !== "string") {
      return res.status(400).json({ error: "plan_id richiesto" });
    }

    const { data: plan } = await supabase
      .from("creator_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!plan) return res.status(404).json({ error: "Piano non trovato" });
    if (plan.contact_only) {
      return res.status(400).json({
        error: "Questo piano è personalizzato — contattaci per attivarlo.",
        contact_only: true,
      });
    }

    const FRONTEND = billing.frontendUrl();
    const successUrl = `${FRONTEND}/dashboard?plan_ok=${encodeURIComponent(plan.id)}`;
    const cancelUrl  = `${FRONTEND}/pricing?plan_cancel=1`;

    if (billing.isStripeEnabled() && plan.stripe_price_id) {
      try {
        const session = await billing.createStripeCheckoutSession({
          userId: user.id,
          userEmail: user.email,
          successUrl, cancelUrl,
          priceId: plan.stripe_price_id,
          metadata: { kind: "creator_plan", plan_id: plan.id },
        });
        return res.json({
          url: session.url,
          sessionId: session.sessionId,
          mode: "stripe",
          plan: { id: plan.id, name: plan.name, price_monthly: plan.price_monthly },
        });
      } catch (e) {
        console.error("[subscribe-plan:stripe]", e.message);
        return res.status(500).json({ error: "Errore avvio checkout" });
      }
    }

    // Fallback: link esterno (legacy) o errore
    if (plan.external_payment_link) {
      return res.json({
        payment_link: plan.external_payment_link,
        plan: { id: plan.id, name: plan.name, price_monthly: plan.price_monthly },
        note: "Una volta completato il pagamento, l'admin attiverà il piano sul tuo account.",
      });
    }
    return res.status(503).json({
      error: "Pagamento non ancora configurato per questo piano. Contatta il supporto.",
    });
  });

  return router;
};
