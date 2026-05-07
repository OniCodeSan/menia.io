// =============================================================================
// Courses API — public list, course detail with gated lessons,
// owner-only create/update.
// External payment flow only: a course has `external_payment_link` and access
// is granted by an admin via /api/admin/grant-course-access (server/admin.js).
// =============================================================================

const express = require("express");
const access = require("./access");

// Validate + clean the optional landing_data payload that drives the sales page.
// Schema: { learning_outcomes: string[], target_audience: string[],
//           for_whom_not: string[], faq: [{q,a}], bonus: string }
function sanitizeLanding(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const trimList = (arr, max = 12, maxLen = 200) =>
    Array.isArray(arr)
      ? arr.filter((x) => typeof x === "string").map((s) => s.slice(0, maxLen)).filter(Boolean).slice(0, max)
      : undefined;
  const out = {};
  if (raw.learning_outcomes !== undefined) out.learning_outcomes = trimList(raw.learning_outcomes);
  if (raw.target_audience !== undefined)   out.target_audience   = trimList(raw.target_audience);
  if (raw.for_whom_not !== undefined)      out.for_whom_not      = trimList(raw.for_whom_not, 8);
  if (raw.bonus !== undefined && typeof raw.bonus === "string") out.bonus = raw.bonus.slice(0, 500);
  if (Array.isArray(raw.faq)) {
    out.faq = raw.faq
      .filter((f) => f && typeof f.q === "string" && typeof f.a === "string")
      .map((f) => ({ q: f.q.slice(0, 200), a: f.a.slice(0, 1000) }))
      .slice(0, 10);
  }
  return out;
}

module.exports = function createCoursesRouter({ supabase, requireUserJWT, emails }) {
  const router = express.Router();
  const certificates = require("./certificates");

  // ---------------------------------------------------------------------------
  // GET /api/courses?sort=ranking|recent — list published courses
  // Default: ranking (visibility_score with 20% randomization)
  // ---------------------------------------------------------------------------
  router.get("/", async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const sort = req.query.sort === "recent" ? "recent" : "ranking";

    const { data, error } = await supabase
      .from("courses")
      .select("id, creator_id, title, description, cover_url, price, external_payment_link, is_published, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[courses:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento corsi" });
    }

    if (!data?.length) return res.json({ courses: [] });

    const creatorIds = [...new Set(data.map((c) => c.creator_id))];
    const courseIds = data.map((c) => c.id);

    const [{ data: creators }, { data: kpis }, { data: lessonRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, handle, avatar_url")
        .in("id", creatorIds),
      supabase
        .from("creator_kpi_aggregated")
        .select("creator_id, visibility_score, total_students")
        .in("creator_id", creatorIds),
      supabase
        .from("course_lessons")
        .select("course_id, is_preview")
        .in("course_id", courseIds),
    ]);
    const cmap = new Map((creators || []).map((p) => [p.id, p]));
    const kmap = new Map((kpis || []).map((k) => [k.creator_id, k]));

    // Aggrega lesson_count + has_preview per corso
    const lessonAgg = new Map();
    (lessonRows || []).forEach((l) => {
      const cur = lessonAgg.get(l.course_id) || { lesson_count: 0, has_preview: false };
      cur.lesson_count += 1;
      if (l.is_preview) cur.has_preview = true;
      lessonAgg.set(l.course_id, cur);
    });

    let courses = data.map((c) => {
      const k = kmap.get(c.creator_id);
      const lAgg = lessonAgg.get(c.id) || { lesson_count: 0, has_preview: false };
      const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
      const freshness = Math.max(0, 100 - ageDays * 10);
      return {
        ...c,
        creator: cmap.get(c.creator_id) || null,
        student_count: k?.total_students || 0,
        lesson_count: lAgg.lesson_count,
        has_preview: lAgg.has_preview,
        ranking_score: (k?.visibility_score || 0) + freshness,
      };
    });

    if (sort === "ranking") {
      courses.sort((a, b) => b.ranking_score - a.ranking_score);
      // 20% random shuffle: pick the bottom 20%, randomize, append
      const split = Math.max(1, Math.floor(courses.length * 0.8));
      const top = courses.slice(0, split);
      const tail = courses.slice(split).sort(() => Math.random() - 0.5);
      courses = top.concat(tail);
      // Inject ~20% slots from the tail to give newcomers visibility
      if (tail.length > 0) {
        const targetSlot = Math.min(Math.floor(courses.length / 5), top.length);
        if (targetSlot > 0 && top.length > targetSlot) {
          const newcomer = tail[Math.floor(Math.random() * tail.length)];
          courses = [
            ...top.slice(0, targetSlot),
            newcomer,
            ...top.slice(targetSlot).filter((c) => c.id !== newcomer.id),
            ...tail.filter((c) => c.id !== newcomer.id),
          ];
        }
      }
    }

    return res.json({ courses, sort });
  });

  // ---------------------------------------------------------------------------
  // GET /api/courses/:id — course detail with lessons (locked flag for non-owners)
  // ---------------------------------------------------------------------------
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const user = await requireUserJWT(req); // null if anonymous
    const userId = user?.id || null;

    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (courseErr) {
      console.error("[courses:detail]", courseErr.message);
      return res.status(500).json({ error: "Errore caricamento corso" });
    }
    if (!course) return res.status(404).json({ error: "Corso non trovato" });

    // Unpublished courses are only visible to the owner
    if (!course.is_published && course.creator_id !== userId) {
      return res.status(404).json({ error: "Corso non trovato" });
    }

    const [granted, platformAccess] = await Promise.all([
      userId ? access.hasCourseAccess(supabase, userId, id) : Promise.resolve(false),
      userId ? access.hasActivePlatformAccess(supabase, userId) : Promise.resolve(false),
    ]);
    const isOwner = userId && course.creator_id === userId;
    // Gating policy:
    //  - course.price === 0  → corso "incluso nell'abbonamento Menia": basta
    //    avere platform_subscriptions attivo (trial o paid) per accedere.
    //  - course.price > 0    → vendita diretta del formatore. L'abbonamento
    //    Menia NON sblocca questi corsi: serve un grant esplicito in
    //    course_access (acquisto via link Stripe del formatore).
    //  - is_owner sempre full access; preview lessons (is_preview) gratis a tutti.
    const isPaidCourse = Number(course.price) > 0;
    const has_access = isOwner || granted || (!isPaidCourse && platformAccess);
    // access_reason distingue 2 tipi di blocco lato client:
    //   "paywall_paid"     → corso a pagamento del formatore: mostra link checkout
    //   "paywall_platform" → corso free ma utente senza abbonamento Menia
    const access_reason = isOwner ? "owner"
      : granted ? "grant"
      : (!isPaidCourse && platformAccess) ? "platform"
      : isPaidCourse ? "paywall_paid"
      : "paywall_platform";

    const { data: lessons, error: lessonsErr } = await supabase
      .from("course_lessons")
      .select("id, title, body, media_url, media_path, position, is_preview, attachments, created_at")
      .eq("course_id", id)
      .order("position", { ascending: true });

    if (lessonsErr) {
      console.error("[courses:lessons]", lessonsErr.message);
      return res.status(500).json({ error: "Errore caricamento lezioni" });
    }

    const visible = (lessons || []).map((l) => {
      const accessible = has_access || l.is_preview;
      const att = Array.isArray(l.attachments) ? l.attachments : [];
      return {
        id: l.id,
        title: l.title,
        position: l.position,
        is_preview: l.is_preview,
        body: accessible ? l.body : null,
        media_url: accessible ? l.media_url : null,
        media_path: accessible ? l.media_path : null,
        attachments: accessible ? att : [],
        attachment_count: att.length,
        locked: !accessible,
      };
    });

    // Creator card: same merge logic as /api/creators/:id (creator_profiles
    // overrides profile fallbacks). Keeps the course page self-sufficient.
    const [profileRes, creatorExtraRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, handle, bio, avatar_url")
        .eq("id", course.creator_id)
        .maybeSingle(),
      supabase
        .from("creator_profiles")
        .select("bio, profile_image_url, channel_name")
        .eq("user_id", course.creator_id)
        .maybeSingle(),
    ]);
    const profile = profileRes.data;
    const extra = creatorExtraRes.data;
    const creator = profile ? {
      id: profile.id,
      handle: profile.handle,
      full_name: profile.full_name,
      channel_name: extra?.channel_name || profile.full_name,
      profile_image_url: extra?.profile_image_url || profile.avatar_url,
      bio: extra?.bio || profile.bio || null,
    } : null;

    return res.json({
      course,
      lessons: visible,
      creator,
      has_access,
      access_reason,
      is_owner: isOwner,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/courses — creator creates a draft course
  // ---------------------------------------------------------------------------
  router.post("/", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { title, description, cover_url, price, external_payment_link, is_published } = req.body || {};

    if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ error: "title obbligatorio (3-200 caratteri)" });
    }
    if (description !== undefined && description !== null) {
      if (typeof description !== "string" || description.length > 5000) {
        return res.status(400).json({ error: "description non valida (max 5000)" });
      }
    }
    const priceN = price === undefined || price === null ? 0 : Number(price);
    if (!Number.isFinite(priceN) || priceN < 0 || priceN > 99999) {
      return res.status(400).json({ error: "price non valido (0-99999)" });
    }
    if (external_payment_link !== undefined && external_payment_link !== null) {
      if (typeof external_payment_link !== "string" || external_payment_link.length > 500) {
        return res.status(400).json({ error: "external_payment_link non valido" });
      }
      if (external_payment_link && !/^https:\/\//i.test(external_payment_link)) {
        return res.status(400).json({ error: "external_payment_link deve iniziare con https://" });
      }
    }

    // Plan limit check
    const { data: limitCheck } = await supabase.rpc("check_plan_limit", {
      p_creator_id: user.id,
      p_kind: "courses",
    });
    if (limitCheck && !limitCheck.ok) {
      return res.status(402).json({
        error: `Hai raggiunto il limite di ${limitCheck.limit} corsi del piano ${limitCheck.plan}. Passa a un piano superiore per crearne altri.`,
        plan_limit: limitCheck,
        upgrade_required: true,
      });
    }

    const landing_data = sanitizeLanding(req.body?.landing_data);

    const { data, error } = await supabase
      .from("courses")
      .insert({
        creator_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        cover_url: cover_url || null,
        price: priceN,
        external_payment_link: external_payment_link || null,
        is_published: !!is_published,
        landing_data,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[courses:create]", error.message);
      return res.status(500).json({ error: "Errore creazione corso" });
    }
    // Refresh aggregated KPI so the dashboard counters reflect the new state
    // (total_courses counts published rows; recompute keeps the agg in sync
    // even on draft creates so the next publish toggle is consistent).
    try { await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }); } catch (e) { global._silentReport && global._silentReport("kpi-compute")(e); }
    return res.status(201).json({ course: data });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/courses/:id — owner updates course
  // ---------------------------------------------------------------------------
  router.patch("/:id", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const allowed = ["title", "description", "cover_url", "price", "external_payment_link", "is_published", "landing_data"];
    const patch = {};
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Nessun campo da aggiornare" });
    if (patch.landing_data !== undefined) patch.landing_data = sanitizeLanding(patch.landing_data);

    if (patch.title !== undefined) {
      if (typeof patch.title !== "string" || patch.title.trim().length < 3 || patch.title.trim().length > 200) {
        return res.status(400).json({ error: "title non valido" });
      }
      patch.title = patch.title.trim();
    }
    if (patch.price !== undefined) {
      const n = Number(patch.price);
      if (!Number.isFinite(n) || n < 0 || n > 99999) return res.status(400).json({ error: "price non valido" });
      patch.price = n;
    }
    if (patch.external_payment_link !== undefined && patch.external_payment_link !== null) {
      if (typeof patch.external_payment_link !== "string" || patch.external_payment_link.length > 500) {
        return res.status(400).json({ error: "external_payment_link non valido" });
      }
      if (patch.external_payment_link && !/^https:\/\//i.test(patch.external_payment_link)) {
        return res.status(400).json({ error: "external_payment_link deve iniziare con https://" });
      }
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("courses")
      .update(patch)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[courses:update]", error.message);
      return res.status(500).json({ error: "Errore aggiornamento corso" });
    }
    if (!data) return res.status(404).json({ error: "Corso non trovato o non di tua proprietà" });
    // Recompute creator KPIs whenever publish state changes (it's the only
    // toggle that moves total_courses). Cheap RPC, fire-and-forget.
    if (Object.prototype.hasOwnProperty.call(patch, "is_published")) {
      try { await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }); } catch (e) { global._silentReport && global._silentReport("kpi-compute")(e); }
    }
    return res.json({ course: data });
  });

  // ---------------------------------------------------------------------------
  // POST /api/courses/save-draft
  // body: { course: {...}, lessons: [...] }
  // Snapshots the editor state with versioning. Last 5 versions kept (cron).
  // ---------------------------------------------------------------------------
  router.post("/save-draft", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { course, lessons } = req.body || {};
    if (!course || !course.id) return res.status(400).json({ error: "course.id richiesto" });
    if (!access.isUuid(course.id)) return res.status(400).json({ error: "course.id non valido" });

    // Verify ownership
    const { data: row } = await supabase
      .from("courses")
      .select("creator_id")
      .eq("id", course.id)
      .maybeSingle();
    if (!row) return res.status(404).json({ error: "Corso non trovato" });
    if (row.creator_id !== user.id) return res.status(403).json({ error: "Corso non di tua proprietà" });

    // Defensive size cap on snapshot (~1MB JSON)
    const payload = { course, lessons: Array.isArray(lessons) ? lessons : [] };
    const json = JSON.stringify(payload);
    if (json.length > 1_000_000) {
      return res.status(413).json({ error: "Snapshot troppo grande (>1MB)" });
    }

    // Get last version
    const { data: last } = await supabase
      .from("course_drafts")
      .select("version")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const newVersion = (last?.version || 0) + 1;

    const { error } = await supabase
      .from("course_drafts")
      .insert({
        course_id: course.id,
        creator_id: user.id,
        data: payload,
        version: newVersion,
      });

    if (error) {
      console.error("[courses:save-draft]", error.message);
      return res.status(500).json({ error: "Errore salvataggio bozza" });
    }
    return res.json({ ok: true, version: newVersion });
  });

  // ---------------------------------------------------------------------------
  // GET /api/courses/:id/draft  — fetch latest draft snapshot
  // ---------------------------------------------------------------------------
  router.get("/:id/draft", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    // Verify ownership
    const { data: row } = await supabase
      .from("courses")
      .select("creator_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) return res.status(404).json({ error: "Corso non trovato" });
    if (row.creator_id !== user.id) return res.status(403).json({ error: "Corso non di tua proprietà" });

    const { data, error } = await supabase
      .from("course_drafts")
      .select("data, version, created_at")
      .eq("course_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[courses:draft-get]", error.message);
      return res.status(500).json({ error: "Errore caricamento bozza" });
    }
    return res.json({
      draft: data ? data.data : null,
      version: data?.version || 0,
      created_at: data?.created_at || null,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/courses/:id/check-completion
  // Chiamato dal client dopo ogni markComplete. Se 100% lezioni completate
  // genera attestato (idempotente). Risponde sempre 200 con { issued, ... }.
  // ---------------------------------------------------------------------------
  router.post("/:id/check-completion", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { id: courseId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) {
      return res.status(400).json({ error: "courseId non valido" });
    }

    try {
      const result = await certificates.issueIfComplete({
        userId: user.id,
        courseId,
        supabase,
        emails,
      });
      res.json(result);
    } catch (err) {
      console.error("[courses/check-completion]", err.message);
      res.status(500).json({ error: "Errore verifica completamento" });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/courses/:id/certificate
  // Ritorna metadati del certificato dell'utente (se esiste) + signed URL al PDF
  // ---------------------------------------------------------------------------
  router.get("/:id/certificate", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id: courseId } = req.params;

    const { data: cert } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!cert) return res.status(404).json({ error: "Certificato non disponibile" });

    let downloadUrl = null;
    if (cert.pdf_path) {
      const { data: signed } = await supabase.storage
        .from("certificates")
        .createSignedUrl(cert.pdf_path, 60 * 60); // 1 ora
      downloadUrl = signed?.signedUrl || null;
    }
    res.json({ certificate: cert, download_url: downloadUrl });
  });

  return router;
};
