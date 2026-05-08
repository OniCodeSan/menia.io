#!/usr/bin/env node
// Menia.io — API server
// Runs on Hetzner behind nginx reverse proxy at /api/*

const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.3,
  });
}

// Helper per registrare errori "silenziosi": catch che soft-failano senza
// re-throw. Capture-a su Sentry con tag silent=true + label per filtraggio.
// Es: try { await foo() } catch (e) { silentReport("kpi-compute")(e); }
const silentReport = (label) => (err) => {
  try {
    if (process.env.SENTRY_DSN && err) {
      Sentry.captureException(err, { tags: { silent: true, label } });
    }
  } catch {}
};
// Esposto globally per riusarlo dai router senza duplicare l'import
global._silentReport = silentReport;

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
  FRONTEND_URL = "https://menia.io",
} = process.env;

const PRE_LAUNCH_MODE = String(process.env.PRE_LAUNCH_MODE || "true").toLowerCase() === "true";
if (PRE_LAUNCH_MODE) {
  console.log("[menia-api] PRE_LAUNCH_MODE=true — real payments disabled");
}

if (!SUPABASE_URL) throw new Error("SUPABASE_URL required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
if (FRONTEND_URL && !/^https?:\/\/.+/.test(FRONTEND_URL)) throw new Error("FRONTEND_URL must be a valid URL");
if (!ADMIN_SECRET || ADMIN_SECRET.length < 16) throw new Error("ADMIN_SECRET required (min 16 chars)");

function timingSafeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const emails = require("./emails");

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const helmet = require("helmet");
const app = express();

app.use(helmet({
  contentSecurityPolicy: false,        // gestita sotto in report-only mode
  crossOriginEmbedderPolicy: false,
}));

// ---------------------------------------------------------------------------
// CSP — Report-Only mode (Phase 1).
// Non blocca, ma logga le violation. Dopo qualche giorno di traffico reale
// senza report critici, si può promuovere a enforcement (header normale).
// La policy specchia quella nei <meta> dei bundle frontend per consistenza.
// ---------------------------------------------------------------------------
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://live.menia.io https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.sentry.io https://live.menia.io wss://live.menia.io https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://*.stripe.com https://gumroad.com https://*.gumroad.com https://*.lemonsqueezy.com https://live.menia.io",
  "form-action 'self' https://*.stripe.com https://gumroad.com https://*.gumroad.com https://*.lemonsqueezy.com",
  "base-uri 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
  "upgrade-insecure-requests",
].join("; ");

app.use((req, res, next) => {
  // Report-only su tutte le risposte HTML/serve-static. Non interfere su /api/*
  // perché non hanno script eseguibili, ma settarlo ovunque non costa nulla.
  res.setHeader("Content-Security-Policy-Report-Only", CSP_DIRECTIVES);
  next();
});
const ADMIN_URL = process.env.ADMIN_URL || "https://admin.menia.io";
app.use(cors({
  origin: [FRONTEND_URL, ADMIN_URL],
  credentials: true,
}));
app.set("trust proxy", 1);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste, riprova tra qualche minuto" },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste admin" },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste webhook" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste di autenticazione, riprova tra qualche minuto" },
});

const gdprLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste GDPR, riprova tra un'ora" },
});

app.use("/api/admin/", adminLimiter);
app.use("/api/webhooks/", webhookLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/gdpr/", gdprLimiter);
app.use("/api/", generalLimiter);

// CRITICO: il webhook Stripe DEVE ricevere il body raw per la signature
// verification. Mountiamo express.raw SOLO su questo path PRIMA di json globale,
// altrimenti json consuma il body e stripe.webhooks.constructEvent fallisce.
app.use("/api/billing/webhook", express.raw({ type: "application/json", limit: "1mb" }));

app.use(express.json({ limit: "16kb" }));

// ---------------------------------------------------------------------------
// Request stats — window scorrevole 5 min per /admin/system/load.
// Memory-only; restart azzera. Costo per request: ~constant.
// ---------------------------------------------------------------------------
const requestStats = (() => {
  const WINDOW_MS = 5 * 60 * 1000;
  let buf = [];
  let totals = { req: 0, err4xx: 0, err5xx: 0 };
  function record(durationMs, status) {
    const now = Date.now();
    buf.push({ t: now, d: durationMs, s: status });
    totals.req++;
    if (status >= 500) totals.err5xx++;
    else if (status >= 400) totals.err4xx++;
    const cutoff = now - WINDOW_MS;
    while (buf.length && buf[0].t < cutoff) buf.shift();
  }
  function snapshot() {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    while (buf.length && buf[0].t < cutoff) buf.shift();
    if (buf.length === 0) {
      return { window_sec: WINDOW_MS / 1000, requests: 0, rps: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, err_rate: 0, err4xx: 0, err5xx: 0, totals };
    }
    const sorted = buf.map((x) => x.d).sort((a, b) => a - b);
    const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    let e4 = 0, e5 = 0;
    for (const x of buf) {
      if (x.s >= 500) e5++;
      else if (x.s >= 400) e4++;
    }
    return {
      window_sec: WINDOW_MS / 1000,
      requests: buf.length,
      rps: buf.length / (WINDOW_MS / 1000),
      p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99),
      err4xx: e4, err5xx: e5,
      err_rate: (e4 + e5) / buf.length,
      totals,
    };
  }
  return { record, snapshot };
})();
app.set("requestStats", requestStats);
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const start = Date.now();
  res.on("finish", () => {
    requestStats.record(Date.now() - start, res.statusCode);
  });
  next();
});

// ---------------------------------------------------------------------------
// T1 REFACTOR — disable admin endpoints that touched dropped tables
// (token_wallets, payment_orders, payout_requests, profiles.plan).
// 410 Gone signals "permanently removed" so clients stop retrying.
// Code in server/admin.js is preserved for reference / future T2 reverse.
// ---------------------------------------------------------------------------
const T1_DISABLED_ADMIN_PATTERNS = [
  /^\/wallet(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/payouts(\/|$)/,
  /^\/creators\/[a-f0-9-]+\/plan$/,
  /^\/dashboard$/,
];
app.use("/api/admin", (req, res, next) => {
  if (T1_DISABLED_ADMIN_PATTERNS.some((re) => re.test(req.path))) {
    console.warn(`[T1] disabled admin endpoint: ${req.method} ${req.path}`);
    return res.status(410).json({
      error: "Endpoint disattivato (T1 refactor) — token system removed",
      t1: true,
    });
  }
  next();
});

// New T1 admin endpoints (grant/revoke access) — mounted BEFORE the legacy
// router so they take precedence on any path collision.
const adminAccessRouter = require("./admin-access")({ supabase, requireAdminJWT });
app.use("/api/admin", adminAccessRouter);

const adminRouter = require("./admin")({ supabase, requireAdminJWT, emails });
app.use("/api/admin", adminRouter);

// ---------------------------------------------------------------------------
// T1 — public/creator API surface
// `requireUserJWT` is hoisted (function declaration), safe to reference here.
// ---------------------------------------------------------------------------
const coursesRouter      = require("./courses")       ({ supabase, requireUserJWT, emails });
const liveEventsRouter   = require("./live-events")   ({ supabase, requireUserJWT });
const communityRouter    = require("./community")     ({ supabase, requireUserJWT });
const creatorsRouter     = require("./creators")      ({ supabase });
const lessonsRouter      = require("./course-lessons")({ supabase, requireUserJWT });
const kpiRouter          = require("./creator-kpi")   ({ supabase, requireUserJWT, requireAdminJWT });
const plansRouter        = require("./plans")         ({ supabase, requireUserJWT });
const uploadRouter       = require("./upload")        ({ supabase, requireUserJWT });
const billingRouter       = require("./billing")       ({ supabase, requireUserJWT });
const socialRouter        = require("./social")        ({ supabase, requireUserJWT });
const notificationsRouter = require("./notifications") ({ supabase, requireUserJWT });
const preferencesRouter   = require("./preferences")   ({ supabase, requireUserJWT });
app.use("/api/courses",        coursesRouter);
app.use("/api/course-lessons", lessonsRouter);
app.use("/api/live-events",    liveEventsRouter);
app.use("/api/community",      communityRouter);
app.use("/api/creators",       creatorsRouter);
app.use("/api/creator",        kpiRouter);          // /api/creator/kpi, /api/creator/segment
app.use("/api/plans",          plansRouter);        // /api/plans, /api/plans/subscribe
app.use("/api/upload",         uploadRouter);       // /api/upload/video
app.use("/api/billing",        billingRouter);
app.use("/api/social",         socialRouter);
app.use("/api/notifications",  notificationsRouter);
app.use("/api/preferences",    preferencesRouter);

function extractBearerToken(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function requireAdminJWT(req) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return user;
}

// Old /api/admin/topup removed — now in admin.js router

// ---------------------------------------------------------------------------
// POST /api/send-welcome — invia email di benvenuto dopo registrazione
// Auth: Supabase JWT (user can only trigger their own welcome email)
// ---------------------------------------------------------------------------
app.post("/api/send-welcome", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "Token mancante" });
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authUser) return res.status(401).json({ error: "Non autenticato" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, handle, role")
      .eq("id", authUser.id)
      .maybeSingle();

    // Split welcome per ruolo: creator vs studente
    const isCreator = profile?.role === "creator" || profile?.role === "admin";
    if (isCreator) {
      await emails.sendCreatorWelcome({ email: authUser.email, name: profile?.full_name });
    } else {
      await emails.sendWelcome({ email: authUser.email, name: profile?.full_name });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[send-welcome]", err.message);
    return res.status(500).json({ error: "Errore invio email" });
  }
});

// Old /api/admin/payout-action removed — now in admin.js router


// ---------------------------------------------------------------------------
// GDPR — utilities
// ---------------------------------------------------------------------------

function calculateAge(dob) {
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return -1;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function clientIp(req) {
  return req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
}

const VALID_CONSENT_ACTIONS = new Set(["accept", "reject", "update", "revoke"]);
const VALID_CONSENT_TYPES = new Set(["cookie", "marketing", "analytics"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserJWT(req) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const truncStr = (v, max = 255) => (typeof v === "string" ? v.slice(0, max) : null);

async function logLogin({ userId, email, success, ip, userAgent, reason }) {
  await supabase.from("login_log").insert({
    user_id: userId || null,
    email: truncStr(email),
    success,
    ip_address: truncStr(ip, 45),
    user_agent: truncStr(userAgent, 500),
    failure_reason: truncStr(reason, 500),
  }).then(() => {}).catch((err) => console.error("[login_log]", err.message));
}

// ---------------------------------------------------------------------------
// POST /api/auth/validate-age — server-side age check before signup
// ---------------------------------------------------------------------------
const VALID_ROLES = new Set(["fan", "creator"]);

app.post("/api/auth/validate-age", (req, res) => {
  const { date_of_birth } = req.body;
  const role = VALID_ROLES.has(req.body.role) ? req.body.role : "fan";
  if (!date_of_birth || !DATE_RE.test(date_of_birth)) {
    return res.status(400).json({ error: "Data di nascita non valida (formato: YYYY-MM-DD)" });
  }
  const age = calculateAge(date_of_birth);
  if (age < 0) return res.status(400).json({ error: "Data di nascita non valida" });

  const minAge = role === "creator" ? 18 : 16;
  if (age < minAge) {
    return res.status(403).json({
      error: role === "creator"
        ? "Per diventare creator devi avere almeno 18 anni"
        : "Per registrarti devi avere almeno 16 anni",
      min_age: minAge,
      age,
    });
  }
  return res.json({ ok: true, age, eligible: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login-log — log login attempts (called from frontend)
// ---------------------------------------------------------------------------
app.post("/api/auth/login-log", async (req, res) => {
  const { email, success, failure_reason } = req.body;
  if (typeof success !== "boolean") return res.status(400).json({ error: "success required" });
  const user = await requireUserJWT(req);
  await logLogin({
    userId: user?.id,
    email: email || user?.email,
    success,
    ip: clientIp(req),
    userAgent: req.headers["user-agent"],
    reason: failure_reason,
  });
  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GDPR — consent, export, deletion, marketing
// ---------------------------------------------------------------------------

app.post("/api/gdpr/consent", async (req, res) => {
  try {
    const user = await requireUserJWT(req);
    const { consent_type, categories, action, policy_version, session_id } = req.body;

    if (!action || !VALID_CONSENT_ACTIONS.has(action)) {
      return res.status(400).json({ error: "action non valida (accept/reject/update/revoke)" });
    }
    if (consent_type && !VALID_CONSENT_TYPES.has(consent_type)) {
      return res.status(400).json({ error: "consent_type non valido" });
    }
    if (!user && !session_id) {
      return res.status(400).json({ error: "session_id obbligatorio per utenti anonimi" });
    }
    if (categories && typeof categories !== "object") {
      return res.status(400).json({ error: "categories deve essere un oggetto JSON" });
    }

    await supabase.from("consent_log").insert({
      user_id: user?.id || null,
      session_id: session_id || null,
      ip_address: clientIp(req),
      consent_type: consent_type || "cookie",
      categories: categories || { necessary: true },
      action,
      policy_version: policy_version || "1.0",
      user_agent: req.headers["user-agent"] || null,
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[gdpr/consent]", err.message);
    return res.status(500).json({ error: "Errore salvataggio consenso" });
  }
});

app.post("/api/gdpr/export-request", async (req, res) => {
  try {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    const { data: existing } = await supabase
      .from("data_export_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .maybeSingle();

    if (existing) {
      return res.json({ ok: true, message: "Richiesta già in corso", request: existing });
    }

    const [profileRes, walletsRes, txRes, ordersRes, consentsRes, loginRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("token_wallets").select("*").eq("user_id", user.id),
      supabase.from("token_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
      supabase.from("payment_orders").select("id, order_type, amount_eur, token_amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("consent_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("login_log").select("created_at, success, ip_address").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      profile: profileRes.data || null,
      wallets: walletsRes.data || [],
      transactions: txRes.data || [],
      orders: ordersRes.data || [],
      consent_log: consentsRes.data || [],
      login_log: loginRes.data || [],
    };

    await supabase.from("data_export_requests").insert({
      user_id: user.id,
      status: "ready",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const exportJson = JSON.stringify(exportData, null, 2);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="menia-data-export-${user.id}.json"`);
    return res.send(exportJson);
  } catch (err) {
    console.error("[gdpr/export]", err.message);
    return res.status(500).json({ error: "Errore esportazione dati" });
  }
});

app.post("/api/gdpr/delete-request", async (req, res) => {
  try {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    const { data: existing } = await supabase
      .from("deletion_requests")
      .select("id, status, scheduled_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .maybeSingle();

    if (existing) {
      return res.json({ ok: true, message: "Richiesta già in corso", request: existing });
    }

    const reason = typeof req.body.reason === "string" ? req.body.reason.slice(0, 500) : null;

    const { data: delReq } = await supabase
      .from("deletion_requests")
      .insert({ user_id: user.id, reason })
      .select("id, scheduled_at")
      .single();

    await supabase.from("profiles")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", user.id);

    console.log(`[gdpr] deletion request for ${user.id}, scheduled ${delReq.scheduled_at}`);
    return res.json({ ok: true, request: delReq });
  } catch (err) {
    console.error("[gdpr/delete]", err.message);
    return res.status(500).json({ error: "Errore richiesta eliminazione" });
  }
});

app.post("/api/gdpr/cancel-deletion", async (req, res) => {
  try {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    await supabase.from("deletion_requests")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .in("status", ["pending"]);

    await supabase.from("profiles")
      .update({ deletion_requested_at: null })
      .eq("id", user.id);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[gdpr/cancel-deletion]", err.message);
    return res.status(500).json({ error: "Errore annullamento" });
  }
});

app.post("/api/gdpr/marketing-consent", async (req, res) => {
  try {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    const consent = !!req.body.consent;
    await supabase.from("profiles").update({
      marketing_consent: consent,
      marketing_consent_at: new Date().toISOString(),
    }).eq("id", user.id);

    await supabase.from("consent_log").insert({
      user_id: user.id,
      consent_type: "marketing",
      categories: { marketing: consent },
      action: consent ? "accept" : "revoke",
      ip_address: clientIp(req),
      user_agent: req.headers["user-agent"] || null,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[gdpr/marketing]", err.message);
    return res.status(500).json({ error: "Errore aggiornamento consenso" });
  }
});

// ---------------------------------------------------------------------------
// CRON — hardened GDPR jobs with monitoring, batching, retry
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

let _cronTableMissing = false;

async function updateCronStatus(job, status, { error = null, durationMs = 0, details = null } = {}) {
  if (_cronTableMissing) return;
  const { error: upsertErr } = await supabase.from("cron_status").upsert({
    job_name: job,
    last_run: new Date().toISOString(),
    status,
    error: error ? String(error).slice(0, 1000) : null,
    duration_ms: durationMs,
    details,
    updated_at: new Date().toISOString(),
  });
  if (upsertErr) {
    if (upsertErr.code === "PGRST205" || upsertErr.code === "42P01") {
      console.warn("[cron-status] table missing — run gdpr_cron_monitoring.sql in Supabase SQL Editor");
      _cronTableMissing = true;
    } else {
      console.error("[cron-status] write failed:", upsertErr.message);
    }
  }
}

async function processAccountDeletions() {
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select("id, user_id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(BATCH_SIZE);

  if (!requests?.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const req of requests) {
    try {
      await supabase.from("deletion_requests")
        .update({ status: "processing" })
        .eq("id", req.id);

      await supabase.from("profiles").update({
        email: `deleted_${req.user_id.slice(0, 8)}@removed.menia.io`,
        full_name: null,
        handle: null,
        bio: null,
        avatar_url: null,
        cover_url: null,
        date_of_birth: null,
        payout_method: null,
        notification_prefs: null,
        marketing_consent: false,
        deletion_requested_at: null,
        status: "deleted",
      }).eq("id", req.user_id);

      await supabase.from("token_transactions")
        .update({ metadata_json: null })
        .eq("user_id", req.user_id);

      await supabase.auth.admin.deleteUser(req.user_id);

      await supabase.from("deletion_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", req.id);

      processed++;
      console.log(`[CRON] deleted user ${req.user_id}`);
    } catch (err) {
      failed++;
      console.error(`[CRON] error deleting ${req.user_id}:`, err.message);
      await supabase.from("deletion_requests")
        .update({ status: "failed", error_message: err.message })
        .eq("id", req.id)
        .catch(() => {});
    }
  }

  return { processed, failed };
}

async function dataRetentionCleanup() {
  const cutoff = new Date(Date.now() - TWELVE_MONTHS_MS).toISOString();

  const { count: loginCount } = await supabase
    .from("login_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoff)
    .limit(BATCH_SIZE * 100);

  const { count: consentCount } = await supabase
    .from("consent_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoff)
    .limit(BATCH_SIZE * 100);

  const { count: exportCount } = await supabase
    .from("data_export_requests")
    .update({ status: "expired" })
    .eq("status", "ready")
    .lt("expires_at", new Date().toISOString());

  return {
    login_log_deleted: loginCount || 0,
    consent_log_deleted: consentCount || 0,
    exports_expired: exportCount || 0,
  };
}

// T1 REFACTOR — revertExpiredPremium removed (no plan column on profiles)

async function recomputeAllKpi() {
  try {
    const r1 = await supabase.rpc("cron_recompute_all_kpi");
    const r2 = await supabase.rpc("cron_snapshot_kpi_daily");
    if (r1.error) console.warn("[CRON] cron_recompute_all_kpi:", r1.error.message);
    if (r2.error) console.warn("[CRON] cron_snapshot_kpi_daily:", r2.error.message);
    return { recomputed: r1.data ?? 0, snapshot: r2.data ?? 0 };
  } catch (err) {
    console.error("[CRON] KPI failed:", err.message);
    return { recomputed: 0, snapshot: 0, error: err.message };
  }
}

async function expirePlatformSubs() {
  try {
    const { data, error } = await supabase.rpc("cron_expire_platform_subscriptions");
    if (error) {
      console.warn("[CRON] cron_expire_platform_subscriptions:", error.message);
      return { expired: 0, error: error.message };
    }
    return { expired: data ?? 0 };
  } catch (err) {
    console.error("[CRON] expirePlatformSubs failed:", err.message);
    return { expired: 0, error: err.message };
  }
}

async function cleanupAuditLog() {
  try {
    // RPC installata: purge_old_audit_logs(retention_days int default 90)
    // Forziamo 365 da Node per allineare alla policy concordata.
    const { data, error } = await supabase.rpc("purge_old_audit_logs", { retention_days: 365 });
    if (error) {
      if (error.code === "42883" || /does not exist/i.test(error.message)) {
        return { deleted: 0, skipped: "rpc-not-installed" };
      }
      console.warn("[CRON] purge_old_audit_logs:", error.message);
      return { deleted: 0, error: error.message };
    }
    return { deleted: data ?? 0 };
  } catch (err) {
    console.error("[CRON] cleanupAuditLog failed:", err.message);
    return { deleted: 0, error: err.message };
  }
}

async function cleanupCourseDrafts() {
  try {
    const { data, error } = await supabase.rpc("cron_cleanup_course_drafts");
    if (error) {
      console.warn("[CRON] cleanup_course_drafts:", error.message);
      return { deleted: 0, error: error.message };
    }
    return { deleted: data ?? 0 };
  } catch (err) {
    console.error("[CRON] cleanup_course_drafts failed:", err.message);
    return { deleted: 0, error: err.message };
  }
}

// Trial reminder: trova le subscription "trial" che scadono entro 7 giorni
// e che NON hanno ancora ricevuto la mail (deduped via trial_reminder_sent_at).
// La colonna è opzionale: se manca, il filtro è solo sulla finestra temporale.
async function sendTrialExpiringReminders() {
  try {
    const now = Date.now();
    const sevenDaysFromNow = new Date(now + 7 * 86400000).toISOString();
    const today = new Date(now).toISOString();

    const { data: subs, error } = await supabase
      .from("platform_subscriptions")
      .select("user_id, trial_end")
      .eq("status", "trial")
      .lte("trial_end", sevenDaysFromNow)
      .gte("trial_end", today)
      .is("trial_reminder_sent_at", null)
      .limit(200);

    if (error) {
      // Se la colonna trial_reminder_sent_at non esiste, fallback senza dedup
      // (puoi aggiungerla con: ALTER TABLE platform_subscriptions ADD COLUMN
      //  trial_reminder_sent_at timestamptz)
      console.warn("[CRON] trial reminders skip:", error.message);
      return { sent: 0, error: error.message };
    }

    let sent = 0;
    for (const sub of subs || []) {
      try {
        const [{ data: au }, { data: prof }] = await Promise.all([
          supabase.auth.admin.getUserById(sub.user_id),
          supabase.from("profiles").select("full_name").eq("id", sub.user_id).maybeSingle(),
        ]);
        const email = au?.user?.email;
        if (!email) continue;
        const r = await emails.sendTrialExpiring({
          email, name: prof?.full_name || "", expires_at: sub.trial_end,
        });
        if (r.ok) {
          await supabase.from("platform_subscriptions")
            .update({ trial_reminder_sent_at: new Date().toISOString() })
            .eq("user_id", sub.user_id);
          sent++;
        }
      } catch (e) {
        console.warn("[CRON] trial reminder for", sub.user_id, e.message);
      }
    }
    return { sent };
  } catch (err) {
    console.error("[CRON] sendTrialExpiringReminders failed:", err.message);
    return { sent: 0, error: err.message };
  }
}

async function runGdprJobs() {
  const start = Date.now();
  console.log("[CRON] Start GDPR jobs", new Date(start).toISOString());

  try {
    const deletions = await processAccountDeletions();
    const retention = await dataRetentionCleanup();
    const kpi = await recomputeAllKpi();
    const drafts = await cleanupCourseDrafts();
    const platformExpire = await expirePlatformSubs();
    const trialReminders = await sendTrialExpiringReminders();
    const auditCleanup = await cleanupAuditLog();
    const durationMs = Date.now() - start;

    const details = { deletions, retention, kpi, drafts, platformExpire, trialReminders, auditCleanup };
    await updateCronStatus("gdpr", "success", { durationMs, details });

    console.log("[CRON] Done", { ...details, duration: `${durationMs}ms` });
    return details;
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("[CRON ERROR]", err.message);
    await updateCronStatus("gdpr", "failed", { error: err.message, durationMs });

    setTimeout(runGdprJobs, 60_000);
    throw err;
  }
}

function startGdprCron() {
  const INTERVAL = 24 * 60 * 60 * 1000;
  setTimeout(runGdprJobs, 60_000);
  setInterval(runGdprJobs, INTERVAL);
  console.log("[CRON] GDPR scheduler started (first run in 60s, then every 24h)");
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// CSP violation reports — aggregati in memoria e loggati (Sentry-friendly).
// Il browser POSTA qui ad ogni violazione della policy report-only.
// Throttling per non saturare i log: 1 log per (directive,blockedURI) ogni 60s.
// ---------------------------------------------------------------------------
const _cspSeen = new Map(); // key = `${directive}|${blockedURI}` → timestampMs
app.post("/api/csp-report",
  express.json({ type: ["application/csp-report", "application/json"], limit: "32kb" }),
  (req, res) => {
    try {
      const body = req.body || {};
      const r = body["csp-report"] || body;
      const directive = String(r["violated-directive"] || r["effective-directive"] || "?");
      const blocked = String(r["blocked-uri"] || "?");
      const docUri = String(r["document-uri"] || "?");
      const key = `${directive}|${blocked}`;
      const now = Date.now();
      const last = _cspSeen.get(key) || 0;
      if (now - last > 60_000) {
        _cspSeen.set(key, now);
        console.warn(`[CSP-RO] violation directive="${directive}" blocked="${blocked}" doc="${docUri}"`);
        // Cleanup map se troppo grande
        if (_cspSeen.size > 1000) {
          const cutoff = now - 600_000;
          for (const [k, t] of _cspSeen) if (t < cutoff) _cspSeen.delete(k);
        }
      }
    } catch {}
    res.status(204).end();
  }
);

// ---------------------------------------------------------------------------
// Email unsubscribe (one-click via token JWT firmato).
// Link generato lato server e incluso in tutte le email marketing.
// Token signed con ADMIN_SECRET (scope: { uid, kind, exp }).
// Public GET → render HTML conferma; non richiede login per UX immediato.
// ---------------------------------------------------------------------------
const jwt = require("jsonwebtoken");
const UNSUB_SECRET = process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper esposto globally per usarlo nei template email.
global._genUnsubscribeUrl = function (userId, kind = "marketing") {
  if (!userId || !UNSUB_SECRET) return `${FRONTEND_URL}/email/unsubscribe`;
  const token = jwt.sign(
    { uid: userId, kind },
    UNSUB_SECRET,
    { expiresIn: "180d" }  // token valido 6 mesi
  );
  return `${FRONTEND_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
};

app.get("/api/email/unsubscribe", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(unsubPage("Token mancante."));

  let payload;
  try {
    payload = jwt.verify(token, UNSUB_SECRET);
  } catch {
    return res.status(400).send(unsubPage("Link non valido o scaduto."));
  }

  const { uid, kind = "marketing" } = payload;
  if (!uid) return res.status(400).send(unsubPage("Token incompleto."));

  try {
    const patch = { unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (kind === "marketing") patch.marketing = false;
    if (kind === "transactional") patch.transactional = false;

    const { error } = await supabase
      .from("email_preferences")
      .upsert({ user_id: uid, ...patch }, { onConflict: "user_id" });
    if (error) {
      console.error("[email/unsubscribe]", error.message);
      return res.status(500).send(unsubPage("Errore tecnico, riprova più tardi."));
    }
    return res.status(200).send(unsubPage("Unsubscribe confermato.", true));
  } catch (e) {
    console.error("[email/unsubscribe]", e.message);
    return res.status(500).send(unsubPage("Errore tecnico, riprova più tardi."));
  }
});

function unsubPage(msg, ok = false) {
  const color = ok ? "#10b981" : "#ef4444";
  return `<!doctype html><html lang="it"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Menia.io — preferenze email</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
    .card{background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:420px;text-align:center}
    h1{font-size:18px;color:#0a0a0f;margin:0 0 14px}p{color:#3a3a3f;font-size:14px;line-height:1.6;margin:0 0 24px}
    .badge{display:inline-block;width:48px;height:48px;border-radius:50%;background:${color};margin-bottom:16px}
    a{color:#7c3aed;text-decoration:none;font-weight:600;font-size:13px}</style>
    </head><body><div class="card"><div class="badge"></div>
    <h1>${ok ? "Preferenze aggiornate" : "Operazione non completata"}</h1>
    <p>${msg}</p><a href="${FRONTEND_URL}">← Torna a Menia.io</a></div></body></html>`;
}

// ---------------------------------------------------------------------------
// SMTP2GO bounce/complaint webhook.
// SMTP2GO POSTA con tipo evento + email destinataria.
// Configura URL in dashboard: Settings → API Keys → Webhooks → +Add webhook
//   URL: https://menia.io/api/email/smtp2go-webhook
//   Events: bounce, spam_complaint, unsubscribe
// ---------------------------------------------------------------------------
app.post("/api/email/smtp2go-webhook",
  express.json({ limit: "64kb" }),
  async (req, res) => {
    try {
      const ev = req.body || {};
      // SMTP2GO event shape: { event: 'bounce'|'spam_complaint'|'unsubscribe', ... }
      const eventType = String(ev.event || ev.eventtype || "unknown").toLowerCase();
      const email = String(ev.email || ev.recipient || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "missing email" });

      // Resolve user_id da email via auth.users
      const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      // listUsers non supporta filter by email senza loop; uso direct DB
      const { data: prof } = await supabase
        .from("profiles").select("id").eq("email", email).maybeSingle();
      let userId = prof?.id || null;
      if (!userId) {
        // Fallback: cerca via auth.admin.getUserBy filter (paginated, costoso)
        // Per ora skippiamo se non in profiles.
        console.warn("[smtp2go] event for unknown email:", email, eventType);
        return res.status(204).end();
      }

      const nowIso = new Date().toISOString();
      const patch = { user_id: userId, updated_at: nowIso };
      if (eventType === "bounce" || eventType === "hard_bounce") {
        patch.bounced = true;
        patch.bounced_at = nowIso;
        patch.bounce_reason = String(ev.reason || ev.description || "").slice(0, 200);
      } else if (eventType === "spam_complaint" || eventType === "complaint") {
        patch.complained = true;
        patch.complained_at = nowIso;
      } else if (eventType === "unsubscribe") {
        patch.unsubscribed_at = nowIso;
        patch.marketing = false;
      } else {
        return res.status(204).end();
      }

      const { error } = await supabase
        .from("email_preferences")
        .upsert(patch, { onConflict: "user_id" });
      if (error) console.error("[smtp2go] upsert failed:", error.message);

      console.log(`[smtp2go] ${eventType} → ${email} (uid=${userId})`);
      res.status(204).end();
    } catch (err) {
      console.error("[smtp2go-webhook]", err.message);
      res.status(500).json({ error: "Errore webhook" });
    }
  }
);

app.get("/api/checkout/health", (_, res) => {
  if (PRE_LAUNCH_MODE) {
    return res.status(503).json({ status: "beta", message: "Pagamenti disabilitati durante la beta" });
  }
  const ready = Boolean(CCBILL_ACCOUNT && CCBILL_SUBACCOUNT && CCBILL_FLEX_ID && CCBILL_SALT);
  return res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
});

// ---------------------------------------------------------------------------
// GET /api/admin/cron-health — monitoring endpoint for GDPR cron
// ---------------------------------------------------------------------------
const CRON_STALE_MS = 26 * 60 * 60 * 1000; // 26h

app.get("/api/admin/cron-health", async (req, res) => {
  try {
    const admin = await requireAdminJWT(req);
    if (!admin) return res.status(403).json({ error: "Admin richiesto" });

    const { data: job, error: jobErr } = await supabase
      .from("cron_status")
      .select("*")
      .eq("job_name", "gdpr")
      .maybeSingle();

    if (jobErr && (jobErr.code === "PGRST205" || jobErr.code === "42P01")) {
      return res.status(503).json({
        cron_running: false,
        status: "table_missing",
        message: "cron_status table not created — run gdpr_cron_monitoring.sql",
      });
    }

    if (!job) {
      return res.status(503).json({
        cron_running: false,
        status: "never_run",
        message: "GDPR cron has never executed",
      });
    }

    const lastRun = new Date(job.last_run);
    const stale = Date.now() - lastRun.getTime() > CRON_STALE_MS;
    const healthy = job.status === "success" && !stale;

    return res.status(healthy ? 200 : 503).json({
      cron_running: !stale,
      status: healthy ? "healthy" : stale ? "stale" : "failed",
      last_run: job.last_run,
      last_status: job.status,
      duration_ms: job.duration_ms,
      error: job.error || null,
      details: job.details || null,
      message: stale
        ? `CRON DEAD — last run was ${Math.round((Date.now() - lastRun.getTime()) / 3600000)}h ago`
        : job.status !== "success"
          ? `Last run failed: ${job.error}`
          : "OK",
    });
  } catch (err) {
    console.error("[cron-health]", err.message);
    return res.status(500).json({ error: "Errore controllo cron" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/cron-run — manually trigger GDPR jobs (admin only)
// ---------------------------------------------------------------------------
app.post("/api/admin/cron-run", async (req, res) => {
  try {
    const admin = await requireAdminJWT(req);
    if (!admin) return res.status(403).json({ error: "Admin richiesto" });

    const result = await runGdprJobs();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron-run]", err.message);
    return res.status(500).json({ error: "Errore esecuzione cron" });
  }
});

// ---------------------------------------------------------------------------
// Internal audit backup (server-side cron only, requires ADMIN_SECRET)
// ---------------------------------------------------------------------------
app.get("/api/internal/audit-backup", async (req, res) => {
  if (!timingSafeCompare(req.headers["x-admin-secret"] || "", ADMIN_SECRET)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const from = req.query.from || new Date(Date.now() - 86400000).toISOString();
    const to = req.query.to || new Date().toISOString();
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .limit(50000);
    if (error) throw error;
    res.json({ exported_at: new Date().toISOString(), from, to, count: data?.length || 0, logs: data || [] });
  } catch (err) {
    console.error("[audit-backup]", err.message);
    res.status(500).json({ error: "Errore export audit log" });
  }
});

// Sentry error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(Number(PORT), "127.0.0.1", () => {
  console.log(`[menia-api] listening on 127.0.0.1:${PORT}`);
  startGdprCron();
});
