// =============================================================================
// Certificates — auto-emessi al 100% completamento corso.
// Idempotente: 1 attestato per (user_id, course_id) — UNIQUE in DB.
//
// Rendering: HTML template (server/assets/certificate-template.html) →
// Puppeteer (Chromium headless) → PDF buffer. Il template usa placeholder
// {{key}} sostituiti runtime; il QR code viene iniettato come data URL.
//
// Vantaggio: pixel-perfect col browser; per cambiare design basta editare
// il template HTML, nessun touch al codice JS.
// =============================================================================

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const VERIFY_URL_BASE = process.env.MENIA_VERIFY_URL || "https://menia.io/verify";

const TEMPLATE_PATH = path.resolve(__dirname, "assets/certificate-template.html");
let _templateCache = null;
function loadTemplate() {
  if (_templateCache) return _templateCache;
  _templateCache = fs.readFileSync(TEMPLATE_PATH, "utf8");
  return _templateCache;
}

// Logo Menia come data URL (cached) — embedded nel PDF, no fetch a runtime.
const LOGO_CANDIDATES = [
  process.env.MENIA_LOGO_PATH,
  path.resolve(__dirname, "assets/menia-logo-512.png"),
  path.resolve(__dirname, "../public/menia-logo-512.png"),
  path.resolve(__dirname, "../html/menia-logo-512.png"),
].filter(Boolean);
let _logoDataUrlCache = null;
function getLogoDataUrl() {
  if (_logoDataUrlCache !== null) return _logoDataUrlCache;
  const found = LOGO_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (!found) { _logoDataUrlCache = ""; return ""; }
  try {
    const b64 = fs.readFileSync(found).toString("base64");
    _logoDataUrlCache = `data:image/png;base64,${b64}`;
  } catch { _logoDataUrlCache = ""; }
  return _logoDataUrlCache;
}

// Browser singleton — riusato tra emissioni per evitare cold-start ~1s ogni volta.
let _browserPromise = null;
function getBrowser() {
  if (_browserPromise) return _browserPromise;
  const puppeteer = require("puppeteer");
  _browserPromise = puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  }).catch((err) => {
    _browserPromise = null;
    throw err;
  });
  return _browserPromise;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MENIA-${year}-${rand}`;
}

function formatDateIt(date) {
  const months = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Genera il PDF in-memory, ritorna Buffer.
async function generatePdf({ studentName, courseTitle, creatorName, certificateNumber, issuedAt, completedAt }) {
  const verifyUrl = `${VERIFY_URL_BASE}/${certificateNumber}`;

  // QR data URL (iniettato in <img src="...">)
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 200, margin: 0,
      color: { dark: "#111111", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch { qrDataUrl = ""; }

  // Sostituzione placeholder
  const replacements = {
    "{{studentName}}":       escapeHtml(studentName || "—"),
    "{{courseTitle}}":       escapeHtml(courseTitle || "—"),
    "{{creatorName}}":       escapeHtml(creatorName || "—"),
    "{{issuedDate}}":        escapeHtml(formatDateIt(issuedAt)),
    "{{completedDate}}":     escapeHtml(formatDateIt(completedAt || issuedAt)),
    "{{certificateNumber}}": escapeHtml(certificateNumber),
    "{{verifyUrl}}":         escapeHtml(verifyUrl),
    "{{qrCodeDataUrl}}":     qrDataUrl,         // data:image/png;base64,...
    "{{logoDataUrl}}":       getLogoDataUrl(),  // data:image/png;base64,...
  };

  let html = loadTemplate();
  for (const [k, v] of Object.entries(replacements)) {
    html = html.split(k).join(v);
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Attendi caricamento font web (Google Fonts) e decodifica immagini.
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch {}
      }
      const imgs = Array.from(document.images || []);
      await Promise.all(imgs.map((img) => img.complete ? Promise.resolve()
        : new Promise((res) => { img.onload = img.onerror = () => res(); })));
    });
    const pdf = await page.pdf({
      width: "297mm",
      height: "210mm",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return pdf;
  } finally {
    await page.close().catch(() => {});
  }
}

async function issueIfComplete({ userId, courseId, supabase, emails }) {
  if (!userId || !courseId) return { issued: false, reason: "missing_args" };

  const { data: existing } = await supabase
    .from("certificates")
    .select("id, certificate_number, issued_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing) return { issued: false, reason: "already_issued", certificate: existing };

  const [lessonsRes, completionsRes] = await Promise.all([
    supabase.from("course_lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    supabase.from("lesson_completions")
      .select("completed_at", { count: "exact" })
      .eq("course_id", courseId).eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);
  const totalLessons = lessonsRes.count || 0;
  const completedCount = completionsRes.count || 0;
  const lastCompletionAt = completionsRes.data?.[0]?.completed_at || null;

  if (!totalLessons) return { issued: false, reason: "no_lessons" };
  if (completedCount < totalLessons) {
    return { issued: false, reason: "incomplete", progress: { completed: completedCount, total: totalLessons } };
  }

  const [{ data: profile }, { data: course }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("courses").select("title, creator_id").eq("id", courseId).maybeSingle(),
  ]);
  if (!course) return { issued: false, reason: "course_not_found" };

  const { data: creator } = await supabase
    .from("profiles").select("full_name, handle").eq("id", course.creator_id).maybeSingle();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const studentEmail = authUser?.user?.email;
  if (!studentEmail) return { issued: false, reason: "no_email" };

  const studentName = profile?.full_name || studentEmail.split("@")[0];
  const creatorName = creator?.full_name || creator?.handle || "";
  const certificateNumber = generateCertificateNumber();
  const issuedAt = new Date();

  let pdfBuffer;
  try {
    pdfBuffer = await generatePdf({
      studentName, courseTitle: course.title, creatorName,
      certificateNumber, issuedAt,
      completedAt: lastCompletionAt ? new Date(lastCompletionAt) : issuedAt,
    });
  } catch (e) {
    console.error("[certificates] pdf gen failed:", e.message);
    return { issued: false, reason: "pdf_gen_failed", error: e.message };
  }

  const pdfPath = `${userId}/${courseId}.pdf`;
  let uploadOk = true;
  try {
    const { error: upErr } = await supabase.storage
      .from("certificates")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (upErr) { uploadOk = false; console.warn("[certificates] upload failed:", upErr.message); }
  } catch (e) { uploadOk = false; console.warn("[certificates] upload threw:", e.message); }

  const { data: inserted, error: insErr } = await supabase
    .from("certificates")
    .insert({
      user_id: userId,
      course_id: courseId,
      certificate_number: certificateNumber,
      pdf_path: uploadOk ? pdfPath : null,
      issued_at: issuedAt.toISOString(),
    })
    .select()
    .maybeSingle();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: now } = await supabase
        .from("certificates").select("*")
        .eq("user_id", userId).eq("course_id", courseId).maybeSingle();
      return { issued: false, reason: "race_already_issued", certificate: now };
    }
    console.error("[certificates] insert failed:", insErr.message);
    return { issued: false, reason: "db_insert_failed", error: insErr.message };
  }

  if (emails) {
    try {
      const r = await emails.sendCertificate({
        email: studentEmail,
        name: studentName,
        course_title: course.title,
        certificate_number: certificateNumber,
        pdfBuffer,
      });
      if (r?.ok) {
        await supabase.from("certificates")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      }
    } catch (e) {
      console.warn("[certificates] email failed:", e.message);
    }
  }

  console.log(`[certificates] issued ${certificateNumber} → ${studentEmail} for course ${courseId}`);
  return { issued: true, certificate: inserted };
}

module.exports = {
  issueIfComplete,
  generatePdf,
  generateCertificateNumber,
};
