// =============================================================================
// Billing — global subscription paywall €0.99/mese.
// Provider switch automatico:
//   - Se STRIPE_SECRET_KEY è settata → Stripe (Checkout + webhook firmato)
//   - Altrimenti → mockPsp (sviluppo / staging senza credenziali)
// =============================================================================

const express = require("express");

const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRICE_ID       = process.env.STRIPE_PRICE_ID || "";       // price_xxx (€0.99 monthly)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""; // whsec_xxx
const FRONTEND_URL          = process.env.FRONTEND_URL || "https://menia.io";

const STRIPE_ENABLED = !!STRIPE_SECRET_KEY && !!STRIPE_PRICE_ID;
let stripe = null;
if (STRIPE_ENABLED) {
  stripe = require("stripe")(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
  console.log("[billing] Stripe ENABLED with price:", STRIPE_PRICE_ID);
} else {
  console.log("[billing] Stripe not configured — running in MOCK mode");
}

// ---------------------------------------------------------------------------
// Mock PSP fallback (usato solo se Stripe non è configurato)
// ---------------------------------------------------------------------------
const mockPsp = {
  async createCheckoutSession({ userId, successUrl, cancelUrl }) {
    const token = Buffer.from(JSON.stringify({ userId, t: Date.now() })).toString("base64url");
    return {
      url: `${FRONTEND_URL}/billing/mock-checkout?token=${token}&success=${encodeURIComponent(successUrl)}&cancel=${encodeURIComponent(cancelUrl)}`,
      sessionId: `mock_${token}`,
    };
  },
};

// ---------------------------------------------------------------------------
// Stripe — checkout session + webhook handlers
// ---------------------------------------------------------------------------
async function createStripeCheckoutSession({ userId, userEmail, successUrl, cancelUrl, priceId, metadata = {} }) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId || STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: userEmail || undefined,
    client_reference_id: userId,
    metadata: { userId, ...metadata },
    subscription_data: {
      metadata: { userId, ...metadata },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });
  return { url: session.url, sessionId: session.id };
}


// Mappa eventi Stripe → mutazioni DB. Idempotente con dedup su event.id.
// Distingue subscription "platform" (€0,99 studente) da "creator_plan" (€4,99/19/39 formatore)
// usando il metadata.kind impostato al momento del checkout.
async function handleStripeEvent(supabase, event) {
  const nowIso = new Date().toISOString();
  const obj = event.data?.object;
  if (!obj) return;

  const meta = obj.metadata || obj.subscription_details?.metadata || {};
  const userId = meta.userId || null;
  const kind   = meta.kind   || "platform"; // back-compat: vecchi checkout senza kind = platform
  const planId = meta.plan_id || null;       // solo per kind=creator_plan

  // For events that don't carry metadata directly (invoice.*), fetch the
  // subscription to get its metadata.
  let resolvedKind = kind;
  let resolvedUserId = userId;
  let resolvedPlanId = planId;
  if (obj.subscription && (!resolvedUserId || !resolvedKind)) {
    try {
      const sub = typeof obj.subscription === "string"
        ? await stripe.subscriptions.retrieve(obj.subscription)
        : obj.subscription;
      resolvedKind   = resolvedKind   || sub.metadata?.kind   || "platform";
      resolvedUserId = resolvedUserId || sub.metadata?.userId || null;
      resolvedPlanId = resolvedPlanId || sub.metadata?.plan_id || null;
    } catch (e) {
      console.warn("[billing:webhook] could not retrieve sub metadata:", e.message);
    }
  }

  if (resolvedKind === "creator_plan") {
    return handleCreatorPlanEvent(supabase, event, { userId: resolvedUserId, planId: resolvedPlanId, obj, nowIso });
  }
  return handlePlatformEvent(supabase, event, { userId: resolvedUserId, obj, nowIso });
}

async function handlePlatformEvent(supabase, event, { userId, obj, nowIso }) {
  switch (event.type) {
    case "checkout.session.completed":
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      let periodStart = null, periodEnd = null;
      let customerId = null, subscriptionId = null;
      if (obj.subscription) {
        const sub = typeof obj.subscription === "string"
          ? await stripe.subscriptions.retrieve(obj.subscription)
          : obj.subscription;
        periodStart = new Date(sub.current_period_start * 1000).toISOString();
        periodEnd   = new Date(sub.current_period_end   * 1000).toISOString();
        customerId  = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        subscriptionId = sub.id;
      } else if (obj.lines?.data?.[0]?.period) {
        periodStart = new Date(obj.lines.data[0].period.start * 1000).toISOString();
        periodEnd   = new Date(obj.lines.data[0].period.end * 1000).toISOString();
        customerId  = obj.customer;
        subscriptionId = obj.subscription;
      }
      if (!userId) {
        console.warn("[billing:webhook:platform] missing userId metadata on", event.type);
        break;
      }
      await supabase.from("platform_subscriptions").upsert({
        user_id: userId,
        status: "active",
        current_period_start: periodStart || nowIso,
        current_period_end:   periodEnd   || new Date(Date.now() + 30 * 86400000).toISOString(),
        cancel_at_period_end: false,
        external_provider: "stripe",
        external_customer_id: customerId,
        external_subscription_id: subscriptionId,
        updated_at: nowIso,
      }, { onConflict: "user_id" });
      break;
    }

    case "invoice.payment_failed": {
      if (!userId) break;
      await supabase.from("platform_subscriptions")
        .update({ status: "past_due", updated_at: nowIso })
        .eq("user_id", userId);
      break;
    }

    case "customer.subscription.updated": {
      if (!userId) break;
      const cancelAtEnd = !!obj.cancel_at_period_end;
      const status = obj.status === "canceled" ? "canceled"
        : obj.status === "past_due" ? "past_due"
        : obj.status === "active" ? "active"
        : null;
      const patch = { cancel_at_period_end: cancelAtEnd, updated_at: nowIso };
      if (status) patch.status = status;
      if (obj.current_period_end) {
        patch.current_period_end = new Date(obj.current_period_end * 1000).toISOString();
      }
      await supabase.from("platform_subscriptions")
        .update(patch).eq("user_id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      if (!userId) break;
      await supabase.from("platform_subscriptions")
        .update({ status: "canceled", cancel_at_period_end: true, updated_at: nowIso })
        .eq("user_id", userId);
      break;
    }

    default:
      console.log("[billing:webhook:platform] unhandled type:", event.type);
  }
}

async function handleCreatorPlanEvent(supabase, event, { userId, planId, obj, nowIso }) {
  if (!userId || !planId) {
    console.warn("[billing:webhook:creator_plan] missing userId/plan_id metadata on", event.type, { userId, planId });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      let periodEnd = null;
      let subscriptionId = null;
      if (obj.subscription) {
        const sub = typeof obj.subscription === "string"
          ? await stripe.subscriptions.retrieve(obj.subscription)
          : obj.subscription;
        periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        subscriptionId = sub.id;
      }
      // Cancel any existing active sub for this creator (unique-active index)
      await supabase
        .from("creator_plan_subscriptions")
        .update({ status: "cancelled", updated_at: nowIso })
        .eq("creator_id", userId)
        .eq("status", "active");
      await supabase.from("creator_plan_subscriptions").insert({
        creator_id: userId,
        plan_id: planId,
        status: "active",
        expires_at: periodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
        external_reference: subscriptionId || "stripe",
        granted_by: userId,
      });
      try { await supabase.rpc("compute_creator_kpi", { p_creator_id: userId }); } catch {}
      break;
    }

    case "invoice.payment_failed":
    case "customer.subscription.deleted": {
      await supabase.from("creator_plan_subscriptions")
        .update({ status: "cancelled", updated_at: nowIso })
        .eq("creator_id", userId)
        .eq("status", "active");
      break;
    }

    case "customer.subscription.updated": {
      // Renew expires_at on period roll
      if (obj.current_period_end) {
        await supabase.from("creator_plan_subscriptions")
          .update({
            expires_at: new Date(obj.current_period_end * 1000).toISOString(),
            updated_at: nowIso,
          })
          .eq("creator_id", userId)
          .eq("status", "active");
      }
      break;
    }

    default:
      console.log("[billing:webhook:creator_plan] unhandled type:", event.type);
  }
}

module.exports = function createBillingRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  router.get("/me/subscription", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { data, error } = await supabase
      .from("platform_subscriptions").select("*")
      .eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("[billing:me]", error.message);
      return res.status(500).json({ error: "Errore caricamento abbonamento" });
    }
    if (!data) {
      const { data: created } = await supabase.from("platform_subscriptions").insert({
        user_id: user.id, status: "trial",
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }).select("*").maybeSingle();
      return res.json({ subscription: created });
    }
    return res.json({ subscription: data });
  });

  router.post("/me/subscription/checkout", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const successUrl = `${FRONTEND_URL}/billing?ok=1`;
    const cancelUrl  = `${FRONTEND_URL}/billing?cancel=1`;

    try {
      let session;
      if (STRIPE_ENABLED) {
        session = await createStripeCheckoutSession({
          userId: user.id,
          userEmail: user.email,
          successUrl, cancelUrl,
          priceId: STRIPE_PRICE_ID,
          metadata: { kind: "platform" },
        });
      } else {
        session = await mockPsp.createCheckoutSession({
          userId: user.id, successUrl, cancelUrl,
        });
      }
      return res.json({ url: session.url, sessionId: session.sessionId, mode: STRIPE_ENABLED ? "stripe" : "mock" });
    } catch (e) {
      console.error("[billing:checkout]", e.message);
      return res.status(500).json({ error: "Errore avvio checkout" });
    }
  });

  router.post("/me/subscription/cancel", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    // Se Stripe è attivo e c'è una subscription remota, chiedi a Stripe di
    // cancellare a fine periodo. Lo stato locale è aggiornato dal webhook.
    const { data: sub } = await supabase
      .from("platform_subscriptions").select("external_subscription_id, external_provider")
      .eq("user_id", user.id).maybeSingle();

    if (STRIPE_ENABLED && sub?.external_provider === "stripe" && sub?.external_subscription_id) {
      try {
        await stripe.subscriptions.update(sub.external_subscription_id, { cancel_at_period_end: true });
      } catch (e) {
        console.error("[billing:cancel:stripe]", e.message);
        return res.status(500).json({ error: "Errore cancellazione su Stripe" });
      }
    }

    const { data } = await supabase.from("platform_subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id).select("*").maybeSingle();
    return res.json({ subscription: data });
  });

  // -------------------------------------------------------------------------
  // Webhook — Stripe quando attivo, mock JSON altrimenti
  // -------------------------------------------------------------------------
  router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    let event = null;

    if (STRIPE_ENABLED && STRIPE_WEBHOOK_SECRET) {
      // Stripe verification con signature
      const sig = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        console.error("[billing:webhook:stripe] signature verify failed:", e.message);
        return res.status(400).json({ error: `Webhook Error: ${e.message}` });
      }
    } else {
      // Mock: accetta JSON body diretto
      try { event = JSON.parse(req.body.toString("utf8")); } catch { event = null; }
      if (!event || !event.type) return res.status(400).json({ error: "Invalid webhook" });
    }

    // Idempotency dedup
    if (event.id) {
      const { data: dup } = await supabase
        .from("webhook_events").select("id").eq("event_id", event.id).maybeSingle();
      if (dup) return res.json({ received: true, deduped: true });
    }

    try {
      if (STRIPE_ENABLED) {
        await handleStripeEvent(supabase, event);
      } else {
        // Mock event mapping (compat con MockCheckout.jsx)
        const userId = event.data?.userId;
        const nowIso = new Date().toISOString();
        if (event.type === "invoice.paid" && userId) {
          await supabase.from("platform_subscriptions").upsert({
            user_id: userId, status: "active",
            current_period_start: event.data.periodStart || nowIso,
            current_period_end: event.data.periodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
            cancel_at_period_end: false,
            external_provider: "mock",
            external_customer_id: event.data.customerId || null,
            external_subscription_id: event.data.subscriptionId || null,
            updated_at: nowIso,
          }, { onConflict: "user_id" });
        }
      }

      if (event.id) {
        await supabase.from("webhook_events").insert({
          provider: STRIPE_ENABLED ? "stripe" : "mock",
          event_type: event.type, event_id: event.id,
          payload: event, status: "processed",
          processed_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {});
      }
    } catch (e) {
      console.error("[billing:webhook]", e.message);
      return res.status(500).json({ error: "Errore processing webhook" });
    }

    return res.json({ received: true });
  });

  return router;
};

// Helpers exported for reuse by other routers (e.g. creator-kpi for plans).
module.exports.createStripeCheckoutSession = createStripeCheckoutSession;
module.exports.isStripeEnabled = () => STRIPE_ENABLED;
module.exports.frontendUrl = () => FRONTEND_URL;
