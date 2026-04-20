const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "Tokaro.fans <noreply@tokaro.fans>";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://tokaro.fans";

const escapeHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(body) {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13131a;border-radius:16px;border:1px solid #222;overflow:hidden">
  <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #222">
    <img src="${FRONTEND_URL}/tokaro-logo.png" width="48" height="48" alt="Tokaro.fans" style="border-radius:50%">
    <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#fff">Tokaro.fans</p>
  </td></tr>
  <tr><td style="padding:32px 40px">
    ${body}
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid #222;text-align:center">
    <p style="margin:0;font-size:12px;color:#666">
      <a href="${FRONTEND_URL}" style="color:#7c3aed;text-decoration:none">tokaro.fans</a> — La piattaforma per creator
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
    if (!resend) { console.log("[emails] resend not configured, skipping welcome"); return; }
    const firstName = (name || "").split(" ")[0] || "Ciao";
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#fff">Benvenuto su Tokaro.fans! 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6">
        Ciao <strong>${firstName}</strong>, il tuo account è stato creato con successo.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6">
        Esplora i creator, scopri contenuti esclusivi e supporta chi ami con abbonamenti e token.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:12px 32px">
          <a href="${FRONTEND_URL}/explore" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Esplora i creator</a>
        </td></tr>
      </table>
    `);
    try {
      await resend.emails.send({ from: FROM, to: email, subject: "Benvenuto su Tokaro.fans! 🎉", html });
      console.log(`[emails] welcome sent to ${email}`);
    } catch (err) {
      console.error("[emails] welcome error:", err.message);
    }
  },

  async sendTokenPurchase({ email, name, tokens, amountCents }) {
    if (!resend) { console.log("[emails] resend not configured, skipping token receipt"); return; }
    const firstName = (name || "").split(" ")[0] || "Ciao";
    const amount = (amountCents / 100).toFixed(2).replace(".", ",");
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#fff">Ricarica confermata ✅</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6">
        Ciao <strong>${firstName}</strong>, la tua ricarica è stata accreditata con successo.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:12px;border:1px solid #222;margin:0 0 24px">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #222">
            <p style="margin:0;font-size:13px;color:#888">Token accreditati</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f59e0b">${tokens} Token</p>
          </td>
          <td style="padding:16px 20px;border-bottom:1px solid #222;text-align:right">
            <p style="margin:0;font-size:13px;color:#888">Importo pagato</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#fff">€${amount}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.6">
        I token sono già disponibili nel tuo wallet. Usali per sbloccare contenuti premium o supportare i creator.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:12px 32px">
          <a href="${FRONTEND_URL}/fan-dashboard?tab=wallet" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Vai al wallet</a>
        </td></tr>
      </table>
    `);
    try {
      await resend.emails.send({ from: FROM, to: email, subject: `Ricarica confermata — ${tokens} Token`, html });
      console.log(`[emails] token purchase receipt sent to ${email}`);
    } catch (err) {
      console.error("[emails] token purchase error:", err.message);
    }
  },

  async sendPayoutUpdate({ email, name, tokenAmount, euroAmount, status, reason }) {
    if (!resend) { console.log("[emails] resend not configured, skipping payout update"); return; }
    const firstName = (name || "").split(" ")[0] || "Creator";
    const statusLabels = {
      processing: { label: "In elaborazione", color: "#f59e0b", emoji: "⏳" },
      paid: { label: "Pagato", color: "#22c55e", emoji: "✅" },
      rejected: { label: "Rifiutato", color: "#ef4444", emoji: "❌" },
    };
    const s = statusLabels[status] || { label: status, color: "#888", emoji: "📋" };
    const html = layout(`
      <h1 style="margin:0 0 16px;font-size:24px;color:#fff">Aggiornamento Payout ${s.emoji}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6">
        Ciao <strong>${firstName}</strong>, il tuo payout è stato aggiornato.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:12px;border:1px solid #222;margin:0 0 24px">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #222">
            <p style="margin:0;font-size:13px;color:#888">Token</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f59e0b">${tokenAmount} Token</p>
          </td>
          <td style="padding:16px 20px;border-bottom:1px solid #222;text-align:right">
            <p style="margin:0;font-size:13px;color:#888">Importo</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#fff">€${Number(euroAmount).toFixed(2)}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:16px 20px">
            <p style="margin:0;font-size:13px;color:#888">Stato</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${s.color}">${s.label}</p>
            ${reason ? `<p style="margin:8px 0 0;font-size:13px;color:#999">${escapeHtml(reason)}</p>` : ""}
          </td>
        </tr>
      </table>
      ${status === "paid" ? `<p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.6">
        Il pagamento è stato effettuato sul metodo di pagamento associato al tuo account. Controlla il tuo conto entro 2-5 giorni lavorativi.
      </p>` : ""}
      <table cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr><td style="background:#7c3aed;border-radius:8px;padding:12px 32px">
          <a href="${FRONTEND_URL}/dashboard?tab=wallet" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600">Vai al wallet</a>
        </td></tr>
      </table>
    `);
    try {
      await resend.emails.send({ from: FROM, to: email, subject: `Payout ${s.label} — €${Number(euroAmount).toFixed(2)}`, html });
      console.log(`[emails] payout update sent to ${email}`);
    } catch (err) {
      console.error("[emails] payout update error:", err.message);
    }
  },
};

module.exports = emails;
