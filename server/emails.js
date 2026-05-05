// =============================================================================
// Email transactional layer.
//
// Provider pluggable via EMAIL_PROVIDER:
//   "smtp2go" → nodemailer + SMTP2GO (default in produzione)
//   "resend"  → Resend HTTP API (fallback / legacy)
//
// Se mancano le creds del provider scelto, prova l'altro come fallback.
// Se mancano entrambi, log + no-op (utile in dev senza config email).
// =============================================================================

const PROVIDER = (process.env.EMAIL_PROVIDER || "smtp2go").toLowerCase();
const FROM = process.env.EMAIL_FROM || "Menia.io <noreply@menia.io>";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://menia.io";

// ---------- SMTP2GO transport (lazy) -----------------------------------------
let _smtpTransport = null;
function getSmtpTransport() {
  if (_smtpTransport) return _smtpTransport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 2525);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const nodemailer = require("nodemailer");
  _smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || port === 8465 || port === 443,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });
  return _smtpTransport;
}

// ---------- Resend client (lazy fallback) ------------------------------------
let _resend = null;
function getResend() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = require("resend");
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ---------- Low-level send ---------------------------------------------------
// Restituisce { ok: true, provider } o { ok: false, error } senza throw.
async function sendMail({ to, subject, html, text }) {
  if (!to || !subject || !html) {
    return { ok: false, error: "missing to/subject/html" };
  }

  const order = PROVIDER === "resend" ? ["resend", "smtp2go"] : ["smtp2go", "resend"];
  let lastError = null;

  for (const p of order) {
    try {
      if (p === "smtp2go") {
        const t = getSmtpTransport();
        if (!t) continue;
        const info = await t.sendMail({ from: FROM, to, subject, html, text });
        return { ok: true, provider: "smtp2go", id: info.messageId };
      }
      if (p === "resend") {
        const r = getResend();
        if (!r) continue;
        const out = await r.emails.send({ from: FROM, to, subject, html });
        return { ok: true, provider: "resend", id: out.data?.id };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[emails] ${p} failed:`, err.message);
    }
  }

  if (lastError) {
    console.error("[emails] all providers failed:", lastError.message);
    return { ok: false, error: lastError.message };
  }
  console.log("[emails] no provider configured, skipping send");
  return { ok: false, error: "no_provider_configured" };
}

const escapeHtml = (s) => String(s || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(body) {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13131a;border-radius:16px;border:1px solid #222;overflow:hidden">
  <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #222">
    <img src="${FRONTEND_URL}/menia-logo.png" width="48" height="48" alt="Menia.io" style="border-radius:50%">
    <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#fff">Menia.io</p>
  </td></tr>
  <tr><td style="padding:32px 40px">
    ${body}
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid #222;text-align:center">
    <p style="margin:0 0 8px;font-size:12px;color:#666">
      <a href="${FRONTEND_URL}" style="color:#7c3aed;text-decoration:none">menia.io</a> — Formazione online dai migliori formatori italiani
    </p>
    <p style="margin:0;font-size:11px;color:#555">
      <a href="${FRONTEND_URL}/privacy-settings" style="color:#888;text-decoration:underline">Gestisci preferenze email</a> ·
      <a href="${FRONTEND_URL}/privacy" style="color:#888;text-decoration:underline">Privacy Policy</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const emails = {
  async sendWelcome({ email, name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#fff">Benvenuto su Menia.io! 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6">
        Ciao <strong>${firstName}</strong>, il tuo account è stato creato con successo.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6">
        Esplora i corsi, partecipa alla community e applica subito quello che impari.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:12px 32px">
          <a href="${FRONTEND_URL}/courses" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Esplora i corsi</a>
        </td></tr>
      </table>
    `);
    const r = await sendMail({ to: email, subject: "Benvenuto su Menia.io! 🎉", html });
    if (r.ok) console.log(`[emails] welcome sent to ${email} via ${r.provider}`);
    return r;
  },

  // Generico: usato da admin email-test e da altri flussi runtime.
  async sendCustom({ to, subject, html, text }) {
    return sendMail({ to, subject, html, text });
  },

  // Helpers legacy (token wallet rimosso in T1) — non più chiamati ma lasciati
  // per backward compat. Possono essere rimossi quando avremo conferma di
  // nessun caller residuo.
  async sendTokenPurchase() { /* deprecated — token economy removed */ return { ok: false, error: "deprecated" }; },
  async sendPayoutUpdate()   { /* deprecated — payout flow removed   */ return { ok: false, error: "deprecated" }; },
};

module.exports = emails;
