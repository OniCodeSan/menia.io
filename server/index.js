#!/usr/bin/env node
// Tokaro.fans — API server
// Runs on Hetzner behind nginx reverse proxy at /api/*

const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.3,
  });
}

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const crypto = require("crypto");

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_SECRET,
  PORT = "3001",
  FRONTEND_URL = "https://tokaro.fans",
  CCBILL_ACCOUNT,
  CCBILL_SUBACCOUNT,
  CCBILL_FLEX_ID,
  CCBILL_SALT,
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const emails = require("./emails");

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.set("trust proxy", 1);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste, riprova tra qualche minuto" },
});

app.use("/api/", generalLimiter);
app.use(express.json());

// ---------------------------------------------------------------------------
// POST /api/admin/topup — accredita token manualmente (admin only)
// Body: { userId, tokens, description? }
// Header: x-admin-secret
// ---------------------------------------------------------------------------
app.post("/api/admin/topup", async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"];
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    const { userId, tokens, description } = req.body;
    if (!userId || !tokens || tokens <= 0) {
      return res.status(400).json({ error: "userId e tokens (> 0) richiesti" });
    }

    const { data: wallet } = await supabase
      .from("token_wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("wallet_type", "user")
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("token_wallets")
        .update({
          balance: wallet.balance + tokens,
          total_earned: (wallet.total_earned || 0) + tokens,
        })
        .eq("id", wallet.id);
    } else {
      await supabase.from("token_wallets").insert({
        user_id: userId,
        wallet_type: "user",
        balance: tokens,
        total_earned: tokens,
        total_spent: 0,
      });
    }

    await supabase.from("token_transactions").insert({
      user_id: userId,
      wallet_type: "user",
      type: "topup",
      amount: tokens,
      description: description || `Ricarica manuale ${tokens} Token`,
    });

    console.log(`[topup] credited ${tokens} tokens to user ${userId}`);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (email) {
      emails.sendTokenPurchase({
        email,
        name: profile?.full_name,
        tokens,
        amountCents: Math.round(tokens * 11),
      });
    }

    return res.json({ ok: true, tokens, userId });
  } catch (err) {
    console.error("[topup]", err.message);
    return res.status(500).json({ error: "Errore accredito token" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/send-welcome — invia email di benvenuto dopo registrazione
// Auth: Supabase JWT (user can only trigger their own welcome email)
// ---------------------------------------------------------------------------
app.post("/api/send-welcome", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token mancante" });
    }
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !authUser) return res.status(401).json({ error: "Non autenticato" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, handle")
      .eq("id", authUser.id)
      .maybeSingle();

    await emails.sendWelcome({ email: authUser.email, name: profile?.full_name });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[send-welcome]", err.message);
    return res.status(500).json({ error: "Errore invio email" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payout-action — admin gestisce stato payout
// Body: { payoutId, action: "approve"|"reject"|"paid", reason? }
// ---------------------------------------------------------------------------
app.post("/api/payout-action", async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"];
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    const { payoutId, action, reason } = req.body;
    if (!payoutId || !action) return res.status(400).json({ error: "payoutId e action richiesti" });

    const statusMap = { approve: "processing", reject: "rejected", paid: "paid" };
    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: "Azione non valida (approve, reject, paid)" });

    const { data: payout, error: fetchErr } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("id", payoutId)
      .maybeSingle();

    if (fetchErr || !payout) return res.status(404).json({ error: "Payout non trovato" });

    if (action === "reject" && payout.status === "pending") {
      await supabase.rpc("wallet_refund_payout", {
        p_creator_id: payout.creator_id,
        p_token_amount: payout.token_amount,
      });
    }

    const { error: updateErr } = await supabase
      .from("payout_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", payoutId);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    const { data: authUser } = await supabase.auth.admin.getUserById(payout.creator_id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payout.creator_id)
      .maybeSingle();

    const email = authUser?.user?.email;
    if (email) {
      await emails.sendPayoutUpdate({
        email,
        name: profile?.full_name,
        tokenAmount: payout.token_amount,
        euroAmount: payout.euro_amount,
        status: newStatus,
        reason: reason || "",
      });
    }

    return res.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[payout-action]", err.message);
    return res.status(500).json({ error: "Errore gestione payout" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/checkout/start — create CCBill checkout URL for a pending order
// Body: { orderId }
// Auth: Supabase JWT (user must own the order)
// ---------------------------------------------------------------------------
app.post("/api/checkout/start", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token mancante" });
    }
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !authUser) return res.status(401).json({ error: "Non autenticato" });

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId richiesto" });

    const { data: order, error: orderErr } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) return res.status(404).json({ error: "Ordine non trovato" });
    if (order.user_id !== authUser.id) return res.status(403).json({ error: "Ordine non tuo" });
    if (order.status !== "pending") return res.status(400).json({ error: `Ordine non in stato pending (${order.status})` });

    if (!CCBILL_ACCOUNT || !CCBILL_SUBACCOUNT || !CCBILL_FLEX_ID || !CCBILL_SALT) {
      return res.status(503).json({ error: "Gateway non configurato" });
    }

    const priceStr = Number(order.amount_eur).toFixed(2);
    const currencyCode = "978"; // EUR
    const initialPeriod = order.order_type === "creator_plan" ? "30" : "2";

    // CCBill FlexForms dynamic pricing digest
    // MD5(initialPrice + initialPeriod + currencyCode + salt)
    const formDigest = crypto
      .createHash("md5")
      .update(priceStr + initialPeriod + currencyCode + CCBILL_SALT)
      .digest("hex");

    const params = new URLSearchParams({
      clientAccnum: CCBILL_ACCOUNT,
      clientSubacc: CCBILL_SUBACCOUNT,
      formName: CCBILL_FLEX_ID,
      initialPrice: priceStr,
      initialPeriod,
      currencyCode,
      formDigest,
      // Pass order_id through CCBill custom fields
      "X-order_id": order.id,
      "X-order_type": order.order_type,
    });

    const checkoutUrl = `https://api.ccbill.com/wap-frontflex/flexforms/${CCBILL_FLEX_ID}?${params.toString()}`;

    // Mark provider on the order
    await supabase
      .from("payment_orders")
      .update({ provider: "ccbill", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    console.log(`[checkout] started for order ${order.id} (${order.order_type}), amount €${priceStr}`);
    return res.json({ checkoutUrl, orderId: order.id });
  } catch (err) {
    console.error("[checkout/start]", err.message);
    return res.status(500).json({ error: "Errore avvio checkout" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/ccbill — CCBill event notification webhook
// CCBill sends form-encoded or JSON POST with transaction data.
// ---------------------------------------------------------------------------
app.post("/api/webhooks/ccbill", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const body = req.body || {};

    // Basic protection: if CCBILL_SALT is configured, verify the digest on success events
    // For full security, configure nginx IP allowlist for CCBill IPs on this endpoint
    if (CCBILL_SALT && body.responseDigest) {
      const expected = crypto
        .createHash("md5")
        .update((body.subscription_id || body.subscriptionId || "") + "1" + CCBILL_SALT)
        .digest("hex");
      if (body.responseDigest !== expected) {
        console.warn("[ccbill-webhook] digest mismatch, rejecting");
        return res.status(200).send("OK");
      }
    }

    const eventType = body.eventType || body.EventType || "";
    const orderId = body["X-order_id"] || body.order_id || "";
    const providerRef = body.subscription_id || body.subscriptionId || body.transaction_id || body.transactionId || "";

    console.log(`[ccbill-webhook] event=${eventType} order=${orderId} ref=${providerRef}`);
    console.log(`[ccbill-webhook] full body:`, JSON.stringify(body));

    if (!orderId) {
      console.warn("[ccbill-webhook] no order_id in payload, ignoring");
      return res.status(200).send("OK");
    }

    // Verify the order exists
    const { data: order, error: orderErr } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error(`[ccbill-webhook] order not found: ${orderId}`);
      return res.status(200).send("OK");
    }

    // Determine success or failure
    const successEvents = ["NewSaleSuccess", "RenewalSuccess", "NewSaleSuccessEvent"];
    const failEvents = ["NewSaleFailure", "Cancellation", "Chargeback", "NewSaleFailureEvent"];

    if (successEvents.includes(eventType)) {
      // Confirm the order
      try {
        if (order.order_type === "token_pack") {
          const { data: result } = await supabase.rpc("srv_confirm_token_purchase", {
            p_order_id: orderId,
            p_provider_ref: providerRef,
          });
          console.log(`[ccbill-webhook] token purchase confirmed:`, result);
        } else if (order.order_type === "creator_plan") {
          const { data: result } = await supabase.rpc("srv_confirm_plan_purchase", {
            p_order_id: orderId,
            p_provider_ref: providerRef,
          });
          console.log(`[ccbill-webhook] plan purchase confirmed:`, result);
        }

        // Send confirmation email
        const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .maybeSingle();
        const email = authUser?.user?.email;

        if (email && order.order_type === "token_pack") {
          emails.sendTokenPurchase({
            email,
            name: profile?.full_name,
            tokens: order.token_amount,
            amountCents: Math.round(Number(order.amount_eur) * 100),
          });
        }
      } catch (confirmErr) {
        console.error(`[ccbill-webhook] confirm error for ${orderId}:`, confirmErr.message);
      }
    } else if (failEvents.includes(eventType)) {
      try {
        await supabase.rpc("srv_fail_payment_order", {
          p_order_id: orderId,
          p_provider_ref: providerRef,
        });
        console.log(`[ccbill-webhook] order failed: ${orderId}`);
      } catch (failErr) {
        console.error(`[ccbill-webhook] fail error for ${orderId}:`, failErr.message);
      }
    } else {
      console.log(`[ccbill-webhook] unhandled event type: ${eventType}, storing metadata`);
      await supabase
        .from("payment_orders")
        .update({
          metadata_json: { ...((order.metadata_json) || {}), last_webhook_event: eventType, last_webhook_at: new Date().toISOString() },
          provider_reference: providerRef || order.provider_reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    // CCBill expects 200 OK response
    return res.status(200).send("OK");
  } catch (err) {
    console.error("[ccbill-webhook] unhandled error:", err.message);
    return res.status(200).send("OK");
  }
});

// ---------------------------------------------------------------------------
// GET /api/checkout/return — return URL after CCBill checkout
// Redirects user back to frontend with order status
// ---------------------------------------------------------------------------
app.get("/api/checkout/return", async (req, res) => {
  const orderId = req.query.order_id || req.query["X-order_id"] || "";
  if (!orderId) return res.redirect(`${FRONTEND_URL}/token-wallet`);

  const { data: order } = await supabase
    .from("payment_orders")
    .select("order_type")
    .eq("id", orderId)
    .maybeSingle()
    .catch(() => ({ data: null }));

  if (order?.order_type === "creator_plan") {
    return res.redirect(`${FRONTEND_URL}/dashboard?tab=settings&section=billing&order=${orderId}`);
  }
  return res.redirect(`${FRONTEND_URL}/token-wallet?order=${orderId}`);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Sentry error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(Number(PORT), "127.0.0.1", () => {
  console.log(`[tokaro-api] listening on 127.0.0.1:${PORT}`);
});
