// =============================================================================
// Course Lessons CRUD — owner-only create/update/delete.
// Lessons are gated by their parent course (RLS handles visibility on read,
// but the public read path is /api/courses/:id which already returns lessons
// with locked flag).
// =============================================================================

const express = require("express");
const sanitizeHtml = require("sanitize-html");
const access = require("./access");

// Allow-list of HTML tags/attrs that TipTap may emit. Anything else gets
// stripped server-side to neutralize XSS in lesson bodies before they're
// stored and re-served to students.
const LESSON_BODY_SANITIZE = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "b", "i",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  // Force https-only for hyperlinks, kill javascript:/data: schemes.
  allowedSchemes: ["https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    // Force safe target/rel on all anchors.
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

function sanitizeLessonBody(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  if (raw.length > 50000) return null;
  return sanitizeHtml(raw, LESSON_BODY_SANITIZE);
}

// Validate + clean attachments payload (from upload endpoint).
// Schema: [{ url, name, mime, size }] — URLs must be https.
function sanitizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === "object" && typeof a.url === "string" && /^https:\/\//i.test(a.url))
    .map((a) => ({
      url: a.url.slice(0, 1000),
      name: typeof a.name === "string" ? a.name.slice(0, 200) : "documento",
      mime: typeof a.mime === "string" ? a.mime.slice(0, 100) : "application/octet-stream",
      size: Number.isFinite(a.size) ? Math.max(0, Math.floor(a.size)) : 0,
    }))
    .slice(0, 20);
}

module.exports = function createLessonsRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  // Helper: load course and verify ownership in one trip.
  async function ownedCourse(course_id, user_id) {
    if (!access.isUuid(course_id)) return null;
    const { data } = await supabase
      .from("courses")
      .select("id, creator_id")
      .eq("id", course_id)
      .maybeSingle();
    if (!data || data.creator_id !== user_id) return null;
    return data;
  }

  // POST /api/course-lessons
  router.post("/", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { course_id, title, body, media_url, media_path, position, is_preview } = req.body || {};

    if (!access.isUuid(course_id)) return res.status(400).json({ error: "course_id non valido" });
    if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 200) {
      return res.status(400).json({ error: "title obbligatorio (1-200 caratteri)" });
    }
    if (body !== undefined && body !== null) {
      if (typeof body !== "string" || body.length > 50000) {
        return res.status(400).json({ error: "body non valido (max 50000)" });
      }
    }
    let pos = 0;
    if (position !== undefined && position !== null) {
      const n = Number(position);
      if (!Number.isInteger(n) || n < 0 || n > 9999) {
        return res.status(400).json({ error: "position non valida (0-9999)" });
      }
      pos = n;
    }

    const owned = await ownedCourse(course_id, user.id);
    if (!owned) return res.status(404).json({ error: "Corso non trovato o non di tua proprietà" });

    const attachments = sanitizeAttachments(req.body?.attachments);
    const safeBody = sanitizeLessonBody(body);
    if (media_url && !/^https:\/\//i.test(media_url)) {
      return res.status(400).json({ error: "media_url deve usare https://" });
    }

    const { data, error } = await supabase
      .from("course_lessons")
      .insert({
        course_id,
        title: title.trim(),
        body: safeBody,
        media_url: media_url || null,
        media_path: media_path || null,
        position: pos,
        is_preview: !!is_preview,
        attachments,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[course-lessons:create]", error.message);
      return res.status(500).json({ error: "Errore creazione lezione" });
    }
    return res.status(201).json({ lesson: data });
  });

  // PATCH /api/course-lessons/:id
  router.patch("/:id", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    // Verify ownership via course
    const { data: lesson, error: lessonErr } = await supabase
      .from("course_lessons")
      .select("id, course_id")
      .eq("id", id)
      .maybeSingle();
    if (lessonErr) {
      console.error("[course-lessons:lookup]", lessonErr.message);
      return res.status(500).json({ error: "Errore caricamento lezione" });
    }
    if (!lesson) return res.status(404).json({ error: "Lezione non trovata" });

    const owned = await ownedCourse(lesson.course_id, user.id);
    if (!owned) return res.status(403).json({ error: "Lezione non di tua proprietà" });

    const allowed = ["title", "body", "media_url", "media_path", "position", "is_preview", "attachments"];
    const patch = {};
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Nessun campo da aggiornare" });
    if (patch.attachments !== undefined) patch.attachments = sanitizeAttachments(patch.attachments);
    if (patch.body !== undefined) patch.body = sanitizeLessonBody(patch.body);
    if (patch.media_url !== undefined && patch.media_url !== null && patch.media_url !== "") {
      if (typeof patch.media_url !== "string" || !/^https:\/\//i.test(patch.media_url)) {
        return res.status(400).json({ error: "media_url deve usare https://" });
      }
    }

    if (patch.title !== undefined) {
      if (typeof patch.title !== "string" || patch.title.trim().length < 1 || patch.title.trim().length > 200) {
        return res.status(400).json({ error: "title non valido" });
      }
      patch.title = patch.title.trim();
    }
    if (patch.position !== undefined) {
      const n = Number(patch.position);
      if (!Number.isInteger(n) || n < 0 || n > 9999) return res.status(400).json({ error: "position non valida" });
      patch.position = n;
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("course_lessons")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[course-lessons:update]", error.message);
      return res.status(500).json({ error: "Errore aggiornamento lezione" });
    }
    return res.json({ lesson: data });
  });

  // DELETE /api/course-lessons/:id
  router.delete("/:id", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("id, course_id")
      .eq("id", id)
      .maybeSingle();
    if (!lesson) return res.status(404).json({ error: "Lezione non trovata" });

    const owned = await ownedCourse(lesson.course_id, user.id);
    if (!owned) return res.status(403).json({ error: "Lezione non di tua proprietà" });

    const { error } = await supabase
      .from("course_lessons")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[course-lessons:delete]", error.message);
      return res.status(500).json({ error: "Errore eliminazione lezione" });
    }
    return res.json({ ok: true });
  });

  return router;
};
