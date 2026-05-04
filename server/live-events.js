// =============================================================================
// Live Events API — public list, event detail with access flag,
// owner-only create/update.
// External payment flow: a paid event has `external_payment_link`; access is
// granted by an admin via /api/admin/grant-live-access.
// Free events (price=0) are accessible to anyone authenticated.
// =============================================================================

const express = require("express");
const jwt = require("jsonwebtoken");
const access = require("./access");

// Jitsi JWT minting — config letta da env (JITSI_APP_ID, JITSI_APP_SECRET,
// JITSI_DOMAIN). Se mancano, l'endpoint join-token risponde 503.
const JITSI_APP_ID     = process.env.JITSI_APP_ID;
const JITSI_APP_SECRET = process.env.JITSI_APP_SECRET;
const JITSI_DOMAIN     = process.env.JITSI_DOMAIN || "live.menia.io";

// Room name deterministico per evento Menia. Usiamo `menia-<eventId>` così
// formatori e studenti finiscono nella stessa stanza Jitsi senza coordinare.
function jitsiRoomFor(eventId) {
  return `menia-${eventId}`;
}

function signJitsiToken({ user, profile, eventId, isOwner, isModerator }) {
  if (!JITSI_APP_ID || !JITSI_APP_SECRET) {
    throw new Error("Jitsi non configurato sul server");
  }
  const room = jitsiRoomFor(eventId);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "jitsi",
    iss: JITSI_APP_ID,
    sub: JITSI_DOMAIN,
    room,                                  // limit: solo questa room
    iat: now,
    exp: now + 3 * 60 * 60,                // 3 ore di validità
    nbf: now - 30,
    context: {
      user: {
        id: user.id,
        name: profile?.full_name || profile?.handle || "Utente Menia",
        email: user.email || "",
        avatar: profile?.avatar_url || "",
        moderator: !!isModerator,          // estende JWT, alcuni client la leggono
      },
      features: {
        livestreaming: false,
        recording: false,
        screen_sharing: !!isOwner,         // solo formatore condivide lo schermo
      },
    },
    moderator: !!isModerator,              // standard claim per jicofo
  };
  return jwt.sign(payload, JITSI_APP_SECRET, { algorithm: "HS256" });
}

const ALLOWED_STATUS = ["scheduled", "live", "ended", "cancelled"];

module.exports = function createLiveEventsRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  // ---------------------------------------------------------------------------
  // GET /api/live-events — list published events
  // ---------------------------------------------------------------------------
  router.get("/", async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const filterStatus = ALLOWED_STATUS.includes(req.query.status) ? req.query.status : null;

    let q = supabase
      .from("live_events")
      .select("id, creator_id, title, description, cover_url, scheduled_at, duration_minutes, price, external_payment_link, is_published, status, created_at")
      .eq("is_published", true)
      .order("scheduled_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (filterStatus) q = q.eq("status", filterStatus);

    const { data, error } = await q;
    if (error) {
      console.error("[live-events:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento live" });
    }

    if (!data?.length) return res.json({ events: [] });

    const creatorIds = [...new Set(data.map((e) => e.creator_id))];
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, full_name, handle, avatar_url")
      .in("id", creatorIds);
    const cmap = new Map((creators || []).map((p) => [p.id, p]));

    return res.json({
      events: data.map((e) => ({ ...e, creator: cmap.get(e.creator_id) || null })),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/live-events/:id — detail with access flag
  // ---------------------------------------------------------------------------
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const user = await requireUserJWT(req);
    const userId = user?.id || null;

    const { data: ev, error } = await supabase
      .from("live_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[live-events:detail]", error.message);
      return res.status(500).json({ error: "Errore caricamento live" });
    }
    if (!ev) return res.status(404).json({ error: "Live non trovata" });

    if (!ev.is_published && ev.creator_id !== userId) {
      return res.status(404).json({ error: "Live non trovata" });
    }

    const granted = userId ? await access.hasLiveEventAccess(supabase, userId, id) : Number(ev.price || 0) === 0;
    const isOwner = userId && ev.creator_id === userId;

    return res.json({
      event: {
        ...ev,
        // Hide recording_url unless the user has access
        recording_url: granted || isOwner ? ev.recording_url : null,
      },
      has_access: granted,
      is_owner: !!isOwner,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/live-events — creator creates event
  // ---------------------------------------------------------------------------
  router.post("/", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const {
      title, description, cover_url, scheduled_at, duration_minutes,
      price, external_payment_link, is_published, status, stream_url,
    } = req.body || {};

    if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ error: "title obbligatorio (3-200 caratteri)" });
    }
    if (description !== undefined && description !== null) {
      if (typeof description !== "string" || description.length > 5000) {
        return res.status(400).json({ error: "description non valida (max 5000)" });
      }
    }
    let scheduledAt = null;
    if (scheduled_at) {
      const t = new Date(scheduled_at).getTime();
      if (Number.isNaN(t)) return res.status(400).json({ error: "scheduled_at non valido" });
      scheduledAt = new Date(t).toISOString();
    }
    let dur = null;
    if (duration_minutes !== undefined && duration_minutes !== null) {
      const n = Number(duration_minutes);
      if (!Number.isInteger(n) || n < 1 || n > 720) {
        return res.status(400).json({ error: "duration_minutes deve essere 1-720" });
      }
      dur = n;
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
    if (stream_url !== undefined && stream_url !== null && stream_url !== "") {
      if (typeof stream_url !== "string" || stream_url.length > 500) {
        return res.status(400).json({ error: "stream_url non valido" });
      }
      if (!/^https:\/\//i.test(stream_url)) {
        return res.status(400).json({ error: "stream_url deve iniziare con https://" });
      }
    }
    const finalStatus = status && ALLOWED_STATUS.includes(status) ? status : "scheduled";

    // Plan limit check
    const { data: limitCheck } = await supabase.rpc("check_plan_limit", {
      p_creator_id: user.id,
      p_kind: "live",
    });
    if (limitCheck && !limitCheck.ok) {
      return res.status(402).json({
        error: `Hai raggiunto il limite di ${limitCheck.limit} live al mese del piano ${limitCheck.plan}. Passa a un piano superiore per crearne altre.`,
        plan_limit: limitCheck,
        upgrade_required: true,
      });
    }

    const { data, error } = await supabase
      .from("live_events")
      .insert({
        creator_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        cover_url: cover_url || null,
        scheduled_at: scheduledAt,
        duration_minutes: dur,
        price: priceN,
        external_payment_link: external_payment_link || null,
        is_published: !!is_published,
        status: finalStatus,
        stream_url: stream_url || null,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[live-events:create]", error.message);
      return res.status(500).json({ error: "Errore creazione live" });
    }
    // Recompute KPI: a new live counts towards `recent_activity` and the
    // segment score, so the dashboard badge / boost should refresh.
    try { await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }); } catch {}
    return res.status(201).json({ event: data });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/live-events/:id — owner updates event
  // ---------------------------------------------------------------------------
  router.patch("/:id", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const allowed = [
      "title", "description", "cover_url", "scheduled_at", "duration_minutes",
      "price", "external_payment_link", "is_published", "status",
      "recording_url", "stream_url",
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Nessun campo da aggiornare" });

    if (patch.title !== undefined) {
      if (typeof patch.title !== "string" || patch.title.trim().length < 3 || patch.title.trim().length > 200) {
        return res.status(400).json({ error: "title non valido" });
      }
      patch.title = patch.title.trim();
    }
    if (patch.scheduled_at !== undefined && patch.scheduled_at !== null) {
      const t = new Date(patch.scheduled_at).getTime();
      if (Number.isNaN(t)) return res.status(400).json({ error: "scheduled_at non valido" });
      patch.scheduled_at = new Date(t).toISOString();
    }
    if (patch.duration_minutes !== undefined && patch.duration_minutes !== null) {
      const n = Number(patch.duration_minutes);
      if (!Number.isInteger(n) || n < 1 || n > 720) return res.status(400).json({ error: "duration_minutes 1-720" });
      patch.duration_minutes = n;
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
    if (patch.status !== undefined && !ALLOWED_STATUS.includes(patch.status)) {
      return res.status(400).json({ error: "status non valido" });
    }
    if (patch.stream_url !== undefined && patch.stream_url !== null && patch.stream_url !== "") {
      if (typeof patch.stream_url !== "string" || patch.stream_url.length > 500) {
        return res.status(400).json({ error: "stream_url non valido" });
      }
      if (!/^https:\/\//i.test(patch.stream_url)) {
        return res.status(400).json({ error: "stream_url deve iniziare con https://" });
      }
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("live_events")
      .update(patch)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[live-events:update]", error.message);
      return res.status(500).json({ error: "Errore aggiornamento live" });
    }
    if (!data) return res.status(404).json({ error: "Live non trovata o non di tua proprietà" });
    return res.json({ event: data });
  });

  // -------------------------------------------------------------------------
  // POST /api/live-events/:id/start — owner transitions scheduled → live
  // Pattern Tokaro originale: niente URL esterni. Apre la chat-room interna.
  // -------------------------------------------------------------------------
  router.post("/:id/start", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("live_events")
      .update({
        status: "live",
        started_at: nowIso,
        ended_at: null,
        viewer_count: 0,
        updated_at: nowIso,
      })
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[live-events:start]", error.message);
      return res.status(500).json({ error: "Errore avvio live" });
    }
    if (!data) return res.status(404).json({ error: "Live non trovata o non di tua proprietà" });

    // System message di apertura
    await supabase.from("live_chat_messages").insert({
      live_id: id, user_id: user.id, type: "system", message: "La live è iniziata.",
    }).then(() => {}).catch(() => {});

    console.log(`[live-events:start] ${user.id} → ${id}`);
    return res.json({ event: data });
  });

  // -------------------------------------------------------------------------
  // POST /api/live-events/:id/end — owner transitions live → ended
  // -------------------------------------------------------------------------
  router.post("/:id/end", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("live_events")
      .update({ status: "ended", ended_at: nowIso, updated_at: nowIso })
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[live-events:end]", error.message);
      return res.status(500).json({ error: "Errore chiusura live" });
    }
    if (!data) return res.status(404).json({ error: "Live non trovata o non di tua proprietà" });

    await supabase.from("live_chat_messages").insert({
      live_id: id, user_id: user.id, type: "system", message: "La live è terminata.",
    }).then(() => {}).catch(() => {});

    console.log(`[live-events:end] ${user.id} → ${id}`);
    return res.json({ event: data });
  });

  // -------------------------------------------------------------------------
  // POST /api/live-events/:id/chat — invia un messaggio nella chat-room.
  // Anti-flood: max 1 messaggio ogni 1.5s per utente, len 1..500.
  // L'INSERT passa via service-role bypassando RLS (validation server-side).
  // -------------------------------------------------------------------------
  const lastChatAt = new Map(); // userId → ms (in-memory, per istanza)
  router.post("/:id/chat", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const { message } = req.body || {};
    if (typeof message !== "string") return res.status(400).json({ error: "message richiesto" });
    const text = message.trim();
    if (text.length < 1 || text.length > 500) {
      return res.status(400).json({ error: "Messaggio non valido (1-500 caratteri)" });
    }

    const now = Date.now();
    const last = lastChatAt.get(user.id) || 0;
    if (now - last < 1500) {
      return res.status(429).json({ error: "Aspetta un momento prima di rinviare." });
    }

    const { data: ev } = await supabase
      .from("live_events")
      .select("id, status, creator_id, price, is_published")
      .eq("id", id)
      .maybeSingle();
    if (!ev) return res.status(404).json({ error: "Live non trovata" });
    if (ev.status !== "live") return res.status(409).json({ error: "La live non è attiva" });

    const isOwner = ev.creator_id === user.id;
    const granted = isOwner ? true : await access.hasLiveEventAccess(supabase, user.id, id);
    const isFreeOpen = ev.is_published && Number(ev.price) === 0;
    if (!isOwner && !granted && !isFreeOpen) {
      return res.status(403).json({ error: "Non hai accesso a questa live" });
    }

    lastChatAt.set(user.id, now);

    const { data, error } = await supabase
      .from("live_chat_messages")
      .insert({ live_id: id, user_id: user.id, type: "chat", message: text })
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[live-events:chat]", error.message);
      return res.status(500).json({ error: "Errore invio messaggio" });
    }
    return res.status(201).json({ message: data });
  });

  // -------------------------------------------------------------------------
  // POST /api/live-events/:id/join-token — firma un JWT Jitsi per la live-room.
  // Verifica accesso: owner / live_access / live free pubblicata.
  // - Owner → moderator + canPublish (camera/mic + screen share)
  // - Studente → participant subscribe-only (può ricevere video/audio del
  //              formatore ma non pubblica nulla, niente prompt camera/mic)
  // -------------------------------------------------------------------------
  router.post("/:id/join-token", async (req, res) => {
    if (!JITSI_APP_ID || !JITSI_APP_SECRET) {
      return res.status(503).json({ error: "Jitsi non configurato sul server" });
    }

    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const { data: ev } = await supabase
      .from("live_events")
      .select("id, status, creator_id, price, is_published")
      .eq("id", id)
      .maybeSingle();
    if (!ev) return res.status(404).json({ error: "Live non trovata" });

    const isOwner = ev.creator_id === user.id;
    const granted = isOwner ? true : await access.hasLiveEventAccess(supabase, user.id, id);
    const isFreeOpen = ev.is_published && Number(ev.price) === 0;
    if (!isOwner && !granted && !isFreeOpen) {
      return res.status(403).json({ error: "Non hai accesso a questa live" });
    }

    // Profilo Menia per il displayName/avatar dentro Jitsi
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, handle, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    let token;
    try {
      token = signJitsiToken({
        user,
        profile,
        eventId: id,
        isOwner,
        isModerator: isOwner,
      });
    } catch (e) {
      console.error("[live-events:join-token]", e.message);
      return res.status(500).json({ error: "Errore firma token Jitsi" });
    }

    return res.json({
      token,
      domain: JITSI_DOMAIN,
      room: jitsiRoomFor(id),
      role: isOwner ? "moderator" : "participant",
    });
  });

  return router;
};
