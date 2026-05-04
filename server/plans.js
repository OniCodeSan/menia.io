// =============================================================================
// Plans API — public catalog + creator subscribe (returns external link).
// No internal payment: subscribing redirects to the plan's external_payment_link.
// Activation happens via /api/admin/grant-creator-plan after webhook/manual
// confirmation.
// =============================================================================

const express = require("express");

module.exports = function createPlansRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  // GET /api/plans — list active plans
  router.get("/", async (req, res) => {
    const { data, error } = await supabase
      .from("creator_plans")
      .select("id, name, price_monthly, external_payment_link, max_courses, max_live_per_month, analytics_level, priority_visibility, support_level, position, contact_only")
      .eq("is_active", true)
      .order("position", { ascending: true });
    if (error) {
      console.error("[plans:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento piani" });
    }
    const test_mode_active = String(process.env.PRE_LAUNCH_MODE || "true").toLowerCase() === "true";
    return res.json({ plans: data || [], test_mode_active });
  });

  // (POST handler — re-exported below for /api/creator/subscribe-plan mount)
  router.post("/subscribe", async (req, res) => {
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
    if (!plan.external_payment_link) {
      return res.status(503).json({
        error: "Link di pagamento non ancora configurato per questo piano. Contatta il supporto.",
      });
    }

    return res.json({
      payment_link: plan.external_payment_link,
      plan: { id: plan.id, name: plan.name, price_monthly: plan.price_monthly },
      note: "Una volta completato il pagamento, l'admin attiverà il piano sul tuo account.",
    });
  });

  return router;
};
