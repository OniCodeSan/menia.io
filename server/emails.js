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
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e5ea;overflow:hidden">
  <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #efeff2">
    <img src="${FRONTEND_URL}/menia-logo.png" width="56" height="56" alt="Menia.io" style="display:block;margin:0 auto">
    <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#0a0a0f">Menia.io</p>
  </td></tr>
  <tr><td style="padding:32px 40px">
    ${body}
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid #efeff2;text-align:center;background:#fafafb">
    <p style="margin:0 0 8px;font-size:12px;color:#666">
      <a href="${FRONTEND_URL}" style="color:#7c3aed;text-decoration:none;font-weight:600">menia.io</a> — Formazione online dai migliori formatori italiani
    </p>
    <p style="margin:0;font-size:11px;color:#999">
      <a href="${FRONTEND_URL}/privacy-settings" style="color:#666;text-decoration:underline">Gestisci preferenze email</a> ·
      <a href="${FRONTEND_URL}/privacy" style="color:#666;text-decoration:underline">Privacy Policy</a>
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
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Benvenuto su Menia.io 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>, il tuo account è stato creato con successo.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Esplora i corsi, partecipa alla community e applica subito quello che impari.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
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

  // Conferma acquisto corso singolo (tono amichevole)
  async sendCoursePurchase({ email, name, course_title, course_id, creator_name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const courseTitle = escapeHtml(course_title || "il tuo corso");
    const creator = escapeHtml(creator_name || "il formatore");
    const courseUrl = `${FRONTEND_URL}/courses/${encodeURIComponent(course_id || "")}`;
    const subject = `✅ Hai accesso a ${course_title}`;

    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Accesso attivato</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        hai acquistato <strong style="color:#0a0a0f">${courseTitle}</strong> di <strong style="color:#0a0a0f">${creator}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        L'accesso è già attivo nel tuo account. Puoi iniziare subito e riprendere quando vuoi.
      </p>
      <p style="margin:0 0 28px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Se qualcosa non ti torna, trovi il formatore direttamente nella pagina del corso.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${courseUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Apri il corso</a>
        </td></tr>
      </table>
    `);

    const text = `Accesso attivato

Ciao ${firstName},

hai acquistato ${course_title} di ${creator_name}.

L'accesso è già attivo nel tuo account. Puoi iniziare subito e riprendere quando vuoi.

Se qualcosa non ti torna, trovi il formatore direttamente nella pagina del corso.

Apri il corso: ${courseUrl}

— Menia.io`;

    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] course purchase sent to ${email} via ${r.provider}`);
    return r;
  },

  // Abbonamento Menia attivato (€0,99/mese)
  async sendSubscriptionActivated({ email, name, amount }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const amountText = amount
      ? `<p style="margin:0 0 16px;font-size:13px;color:#666;line-height:1.6">Importo: <strong style="color:#0a0a0f">€${escapeHtml(String(amount))}</strong></p>`
      : "";
    const subject = "🎉 Abbonamento attivo";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Sei dentro</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        il tuo abbonamento Menia è attivo.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Da ora hai accesso ai contenuti disponibili e alle funzionalità della piattaforma.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Puoi gestire il tuo abbonamento in qualsiasi momento dal tuo account.
      </p>
      ${amountText}
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/student-dashboard" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Vai al tuo account</a>
        </td></tr>
      </table>
    `);
    const text = `Sei dentro

Ciao ${firstName},

il tuo abbonamento Menia è attivo.

Da ora hai accesso ai contenuti disponibili e alle funzionalità della piattaforma.

Puoi gestire il tuo abbonamento in qualsiasi momento dal tuo account.

Vai al tuo account: ${FRONTEND_URL}/student-dashboard

— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] subscription activated sent to ${email} via ${r.provider}`);
    return r;
  },

  // Piano formatore attivato (Stripe checkout completato per Base/Starter/Grow)
  async sendCreatorPlanActivated({ email, name, plan_name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const planText = plan_name
      ? `<p style="margin:0 0 16px;font-size:13px;color:#666;line-height:1.6">Piano: <strong style="color:#0a0a0f">${escapeHtml(plan_name)}</strong></p>`
      : "";
    const subject = "🚀 Il tuo piano è attivo";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Puoi iniziare a pubblicare</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        il tuo piano formatore è attivo.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Da ora puoi creare corsi, gestire contenuti e iniziare a costruire il tuo spazio su Menia.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Se è il tuo primo corso, ti consigliamo di partire da una struttura semplice e pubblicare velocemente.
      </p>
      ${planText}
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/dashboard" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Crea il tuo primo corso</a>
        </td></tr>
      </table>
    `);
    const text = `Puoi iniziare a pubblicare

Ciao ${firstName},

il tuo piano formatore è attivo.

Da ora puoi creare corsi, gestire contenuti e iniziare a costruire il tuo spazio su Menia.

Se è il tuo primo corso, ti consigliamo di partire da una struttura semplice e pubblicare velocemente.

Crea il tuo primo corso: ${FRONTEND_URL}/dashboard

— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] creator plan activated sent to ${email} via ${r.provider}`);
    return r;
  },

  // Trial in scadenza (cron 7 giorni prima della scadenza trial)
  async sendTrialExpiring({ email, name, expires_at }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const dateFmt = expires_at
      ? new Date(expires_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
      : "presto";
    const subject = "⏳ Il tuo trial sta per finire";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Mancano pochi giorni</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        il tuo periodo di prova termina il <strong style="color:#0a0a0f">${dateFmt}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Per continuare ad accedere ai contenuti e mantenere attivo il tuo account, puoi attivare l'abbonamento in qualsiasi momento.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Se stai usando Menia, è il momento giusto per continuare senza interruzioni.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#f59e0b;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/billing" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Attiva abbonamento</a>
        </td></tr>
      </table>
    `);
    const text = `Mancano pochi giorni

Ciao ${firstName},

il tuo periodo di prova termina il ${dateFmt}.

Per continuare ad accedere ai contenuti e mantenere attivo il tuo account, puoi attivare l'abbonamento in qualsiasi momento.

Se stai usando Menia, è il momento giusto per continuare senza interruzioni.

Attiva abbonamento: ${FRONTEND_URL}/billing

— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] trial expiring sent to ${email} via ${r.provider}`);
    return r;
  },

  // Welcome formatore (signup come creator)
  async sendCreatorWelcome({ email, name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const subject = "Benvenuto su Menia";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Inizia da qui</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        sei dentro Menia.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Qui puoi creare i tuoi corsi, gestire i contenuti e costruire uno spazio tuo.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Il modo migliore per partire è semplice: crea il primo corso e pubblicalo, anche in versione base. Poi lo migliori.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/dashboard" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Crea il tuo primo corso</a>
        </td></tr>
      </table>
    `);
    const text = `Inizia da qui\n\nCiao ${firstName},\n\nsei dentro Menia.\n\nQui puoi creare i tuoi corsi, gestire i contenuti e costruire uno spazio tuo.\n\nIl modo migliore per partire è semplice: crea il primo corso e pubblicalo, anche in versione base. Poi lo migliori.\n\nCrea il tuo primo corso: ${FRONTEND_URL}/dashboard\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] creator welcome sent to ${email} via ${r.provider}`);
    return r;
  },

  // Abbonamento cancellato (utente cancella la subscription)
  async sendSubscriptionCanceled({ email, name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const subject = "Abbonamento disattivato";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Accesso in aggiornamento</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        il tuo abbonamento è stato disattivato.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Potrai continuare a usare Menia fino al termine del periodo già pagato.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Dopo quella data, alcune funzionalità non saranno più disponibili.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#0a0a0f;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/student-dashboard" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Gestisci account</a>
        </td></tr>
      </table>
    `);
    const text = `Accesso in aggiornamento\n\nCiao ${firstName},\n\nil tuo abbonamento è stato disattivato.\n\nPotrai continuare a usare Menia fino al termine del periodo già pagato.\n\nDopo quella data, alcune funzionalità non saranno più disponibili.\n\nGestisci account: ${FRONTEND_URL}/student-dashboard\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] subscription canceled sent to ${email} via ${r.provider}`);
    return r;
  },

  // Promo 3/2 mesi gratis attivata (formatore claim del codice)
  async sendPromoActivated({ email, name, months }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const m = Number(months) || 3;
    const monthsText = m === 1 ? "1 mese" : `${m} mesi`;
    const subject = "Promo attiva";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Hai accesso completo</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        la tua promo è attiva.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Per i prossimi <strong style="color:#0a0a0f">${monthsText}</strong> puoi usare tutte le funzionalità di Menia senza limiti.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        È il momento giusto per pubblicare e testare i tuoi contenuti.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/dashboard" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Vai alla dashboard</a>
        </td></tr>
      </table>
    `);
    const text = `Hai accesso completo\n\nCiao ${firstName},\n\nla tua promo è attiva.\n\nPer i prossimi ${monthsText} puoi usare tutte le funzionalità di Menia senza limiti.\n\nÈ il momento giusto per pubblicare e testare i tuoi contenuti.\n\nVai alla dashboard: ${FRONTEND_URL}/dashboard\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] promo activated sent to ${email} via ${r.provider}`);
    return r;
  },

  // Nuovo studente entrato in un corso (notifica al formatore)
  async sendNewStudent({ email, name, student_name, course_title, course_id }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const studentName = escapeHtml(student_name || "Uno studente");
    const courseTitle = escapeHtml(course_title || "il tuo corso");
    const courseUrl = `${FRONTEND_URL}/dashboard/course/${encodeURIComponent(course_id || "")}/edit`;
    const subject = "Nuovo studente nel tuo corso";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Qualcuno è entrato</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        <strong style="color:#0a0a0f">${studentName}</strong> ha iniziato <strong style="color:#0a0a0f">${courseTitle}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Puoi vedere le attività direttamente dalla dashboard e, se vuoi, interagire con lo studente dalla pagina del corso.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ogni nuovo accesso è un segnale: il contenuto sta funzionando.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${courseUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Apri il corso</a>
        </td></tr>
      </table>
    `);
    const text = `Qualcuno è entrato\n\nCiao ${firstName},\n\n${student_name} ha iniziato ${course_title}.\n\nPuoi vedere le attività direttamente dalla dashboard e, se vuoi, interagire con lo studente dalla pagina del corso.\n\nOgni nuovo accesso è un segnale: il contenuto sta funzionando.\n\nApri il corso: ${courseUrl}\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] new student sent to ${email} via ${r.provider}`);
    return r;
  },

  // Broadcast ricevuto (uno studente segue un creator che ha pubblicato un aggiornamento)
  async sendBroadcastReceived({ email, name, creator_name }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const creator = escapeHtml(creator_name || "Un formatore");
    const subject = `${creator_name || "Un formatore"} ha pubblicato un aggiornamento`;
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Nuovo messaggio</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        <strong style="color:#0a0a0f">${creator}</strong> ha pubblicato un aggiornamento per i suoi studenti.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Puoi leggerlo direttamente nella piattaforma e vedere se riguarda i contenuti che stai seguendo.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${FRONTEND_URL}/messages" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Leggi il messaggio</a>
        </td></tr>
      </table>
    `);
    const text = `Nuovo messaggio\n\nCiao ${firstName},\n\n${creator_name} ha pubblicato un aggiornamento per i suoi studenti.\n\nPuoi leggerlo direttamente nella piattaforma e vedere se riguarda i contenuti che stai seguendo.\n\nLeggi il messaggio: ${FRONTEND_URL}/messages\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] broadcast received sent to ${email} via ${r.provider}`);
    return r;
  },

  // Password reset (custom — da usare se decidiamo di gestire reset lato app
  // invece del template di default Supabase Auth Dashboard)
  async sendPasswordReset({ email, name, reset_link }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const link = String(reset_link || "").trim() || `${FRONTEND_URL}/reset-password`;
    const subject = "Reimposta la tua password";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Richiesta ricevuta</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        abbiamo ricevuto una richiesta per reimpostare la tua password.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Se sei stato tu, usa il link qui sotto per crearne una nuova.
      </p>
      <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.6">
        Se non riconosci questa richiesta, puoi ignorare questa email.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#0a0a0f;border-radius:8px;padding:14px 36px">
          <a href="${escapeHtml(link)}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Reimposta password</a>
        </td></tr>
      </table>
    `);
    const text = `Richiesta ricevuta\n\nCiao ${firstName},\n\nabbiamo ricevuto una richiesta per reimpostare la tua password.\n\nSe sei stato tu, usa il link qui sotto per crearne una nuova.\n\n${link}\n\nSe non riconosci questa richiesta, puoi ignorare questa email.\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] password reset sent to ${email} via ${r.provider}`);
    return r;
  },

  // Email confirmation (custom — da incollare nel Supabase Auth Dashboard se
  // vuoi rimpiazzare il template di default. Lascialo qui anche per uso server-side.)
  async sendEmailConfirmation({ email, name, confirm_link }) {
    const firstName = escapeHtml((name || "").split(" ")[0] || "Ciao");
    const link = String(confirm_link || "").trim() || `${FRONTEND_URL}`;
    const subject = "Conferma il tuo account";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#0a0a0f;font-weight:700">Ultimo passo</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Ciao <strong style="color:#0a0a0f">${firstName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#3a3a3f;line-height:1.6">
        per completare la registrazione devi confermare il tuo indirizzo email.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3f;line-height:1.6">
        Basta un click qui sotto.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:14px 36px">
          <a href="${escapeHtml(link)}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Conferma email</a>
        </td></tr>
      </table>
    `);
    const text = `Ultimo passo\n\nCiao ${firstName},\n\nper completare la registrazione devi confermare il tuo indirizzo email.\n\nBasta un click qui sotto.\n\n${link}\n\n— Menia.io`;
    const r = await sendMail({ to: email, subject, html, text });
    if (r.ok) console.log(`[emails] email confirmation sent to ${email} via ${r.provider}`);
    return r;
  },

  // Helpers legacy (token wallet rimosso in T1) — non più chiamati ma lasciati
  // per backward compat. Possono essere rimossi quando avremo conferma di
  // nessun caller residuo.
  async sendTokenPurchase() { /* deprecated — token economy removed */ return { ok: false, error: "deprecated" }; },
  async sendPayoutUpdate()   { /* deprecated — payout flow removed   */ return { ok: false, error: "deprecated" }; },
};

module.exports = emails;
