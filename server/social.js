// =============================================================================
// Social — Follow + Broadcast.
// Follow: relazione fan→creator (tabella `follows`).
// Broadcast: il creator manda un messaggio a tutti i follower; il fan-out
// scrive 1 row in `notifications` per ogni follower (cursor pagination 500/p).
// Rate limit: max 5 broadcast/giorno solare per creator.
// Mute: i fan possono mutare un creator → fan-out salta i mutati.
// =============================================================================

const express = require("express");
const access = require("./access");

const FANOUT_PAGE_SIZE = 500;
const BROADCASTS_PER_DAY = 5;

module.exports = function createSocialRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  router.post("/follow/:creatorId", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { creatorId } = req.params;
    if (!access.isUuid(creatorId)) return res.status(400).json({ error: "creatorId non valido" });
    if (creatorId === user.id) return res.status(400).json({ error: "Non puoi seguire te stesso" });

    const { data: target } = await supabase
      .from("profiles").select("id, role").eq("id", creatorId).maybeSingle();
    if (!target) return res.status(404).json({ error: "Creator non trovato" });
    if (target.role !== "creator" && target.role !== "admin") {
      return res.status(400).json({ error: "Target non è un creator" });
    }

    const { error } = await supabase.from("follows")
      .upsert({ fan_id: user.id, creator_id: creatorId },
              { onConflict: "fan_id,creator_id" });
    if (error) {
      console.error("[social:follow]", error.message);
      return res.status(500).json({ error: "Errore follow" });
    }
    return res.json({ ok: true, following: true });
  });

  router.delete("/follow/:creatorId", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { creatorId } = req.params;
    if (!access.isUuid(creatorId)) return res.status(400).json({ error: "creatorId non valido" });
    const { error } = await supabase.from("follows").delete()
      .eq("fan_id", user.id).eq("creator_id", creatorId);
    if (error) {
      console.error("[social:unfollow]", error.message);
      return res.status(500).json({ error: "Errore unfollow" });
    }
    return res.json({ ok: true, following: false });
  });

  router.get("/follow/:creatorId/status", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.json({ following: false });
    const { creatorId } = req.params;
    if (!access.isUuid(creatorId)) return res.status(400).json({ error: "creatorId non valido" });
    const { data } = await supabase.from("follows")
      .select("fan_id").eq("fan_id", user.id).eq("creator_id", creatorId).maybeSingle();
    return res.json({ following: !!data });
  });

  // NB: follows.fan_id / follows.creator_id hanno FK verso auth.users, NON
  // verso public.profiles. PostgREST non può embeddare profiles tramite il
  // nome FK. Facciamo join manuale: due query (follows + profiles) e merge in JS.
  router.get("/me/followers", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    const { data: rows, count, error } = await supabase
      .from("follows")
      .select("fan_id, created_at", { count: "exact" })
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) {
      console.error("[social:followers]", error.message);
      return res.status(500).json({ error: "Errore caricamento follower" });
    }
    const ids = (rows || []).map((r) => r.fan_id);
    let profMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,full_name,handle,avatar_url").in("id", ids);
      (profiles || []).forEach((p) => { profMap[p.id] = p; });
    }
    const followers = (rows || []).map((r) => ({
      fan_id: r.fan_id, created_at: r.created_at, profile: profMap[r.fan_id] || null,
    }));
    return res.json({ followers, total: count || 0 });
  });

  router.get("/me/following", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { data: rows, error } = await supabase
      .from("follows").select("creator_id, created_at")
      .eq("fan_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (error) {
      console.error("[social:following]", error.message);
      return res.status(500).json({ error: "Errore caricamento seguiti" });
    }
    const ids = (rows || []).map((r) => r.creator_id);
    let profMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,full_name,handle,avatar_url").in("id", ids);
      (profiles || []).forEach((p) => { profMap[p.id] = p; });
    }
    const following = (rows || []).map((r) => ({
      creator_id: r.creator_id, created_at: r.created_at, profile: profMap[r.creator_id] || null,
    }));
    return res.json({ following });
  });

  router.post("/broadcasts", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
      return res.status(403).json({ error: "Solo i formatori possono inviare broadcast" });
    }

    const { title, body } = req.body || {};
    if (typeof title !== "string" || typeof body !== "string") {
      return res.status(400).json({ error: "title+body richiesti" });
    }
    const cleanTitle = title.trim().slice(0, 200);
    const cleanBody = body.trim().slice(0, 5000);
    if (cleanTitle.length < 1) return res.status(400).json({ error: "title obbligatorio" });
    if (cleanBody.length < 1) return res.status(400).json({ error: "body obbligatorio" });

    // Rate limit 5/giorno solare
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = `${today}T00:00:00Z`;
    const { count: dailyCount } = await supabase
      .from("broadcasts").select("id", { count: "exact", head: true })
      .eq("sender_id", user.id).gte("created_at", todayStart);
    if ((dailyCount || 0) >= BROADCASTS_PER_DAY) {
      return res.status(429).json({
        error: `Limite raggiunto: max ${BROADCASTS_PER_DAY} broadcast oggi. Riprova domani.`,
        resets_at: `${today}T23:59:59Z`,
      });
    }

    const { count: followerCount } = await supabase
      .from("follows").select("fan_id", { count: "exact", head: true })
      .eq("creator_id", user.id);

    const { data: bc, error: bcErr } = await supabase.from("broadcasts").insert({
      sender_id: user.id, title: cleanTitle, body: cleanBody,
      recipient_count: followerCount || 0,
    }).select("*").maybeSingle();
    if (bcErr) {
      console.error("[social:broadcast:create]", bcErr.message);
      return res.status(500).json({ error: "Errore creazione broadcast" });
    }

    console.log(`[broadcast] sender=${user.id} broadcast=${bc.id} followers=${followerCount || 0} title="${cleanTitle.slice(0, 60)}"`);

    res.status(202).json({ broadcast: bc });
    setImmediate(() => {
      fanOutBroadcast(supabase, bc, user.id).catch((e) => {
        console.error("[social:broadcast:fanout]", bc.id, e.message);
      });
    });
  });

  router.get("/broadcasts", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { data, error } = await supabase.from("broadcasts").select("*")
      .eq("sender_id", user.id).order("created_at", { ascending: false }).limit(limit);
    if (error) {
      console.error("[social:broadcasts:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento broadcast" });
    }
    return res.json({ broadcasts: data || [] });
  });

  return router;
};

// fanOutBroadcast — cursor pagination su follows ordinata per fan_id.
// Esclude i fan che hanno mutato il creator (notification_preferences).
async function fanOutBroadcast(supabase, broadcast, senderId) {
  let lastSeen = null;
  let totalDelivered = 0;
  let totalMailed = 0;

  // Nome creator per il subject email — fetched una volta per fanout
  const { data: senderProfile } = await supabase
    .from("profiles").select("full_name, handle").eq("id", senderId).maybeSingle();
  const { data: senderExtra } = await supabase
    .from("creator_profiles").select("channel_name").eq("user_id", senderId).maybeSingle();
  const creatorName = senderExtra?.channel_name || senderProfile?.full_name || senderProfile?.handle || "Un formatore";

  let emails = null;
  try { emails = require("./emails"); } catch {}

  for (;;) {
    let q = supabase.from("follows")
      .select("fan_id").eq("creator_id", senderId)
      .order("fan_id", { ascending: true }).limit(FANOUT_PAGE_SIZE);
    if (lastSeen) q = q.gt("fan_id", lastSeen);

    const { data: batch, error } = await q;
    if (error) { console.error("[fanout:read]", error.message); return; }
    if (!batch || batch.length === 0) break;

    // Filtra i mutati per QUESTO sender
    const fanIds = batch.map((f) => f.fan_id);
    const { data: muted } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("creator_id", senderId)
      .eq("type", "broadcast")
      .eq("muted", true)
      .in("user_id", fanIds);
    const mutedSet = new Set((muted || []).map((m) => m.user_id));

    const activeFans = batch.filter((f) => !mutedSet.has(f.fan_id)).map((f) => f.fan_id);

    const rows = activeFans.map((id) => ({
      user_id: id,
      type: "broadcast",
      title: broadcast.title,
      body: broadcast.body,
      ref_id: broadcast.id,
      read: false,
    }));

    if (rows.length > 0) {
      let { error: insErr } = await supabase.from("notifications").insert(rows);
      if (insErr) {
        console.error("[fanout:insert]", insErr.message, "→ retry");
        const retry = await supabase.from("notifications").insert(rows);
        if (retry.error) console.error("[fanout:insert:retry]", retry.error.message);
        else totalDelivered += rows.length;
      } else {
        totalDelivered += rows.length;
      }
    }

    // Email parallel: fetch email+name per i fan attivi del batch e invia.
    // Soft-fail per ogni mail (errore di un recipient non blocca gli altri).
    if (emails && activeFans.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from("profiles").select("id, full_name").in("id", activeFans);
        const profMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
        // Service-role può leggere auth.users via admin API getUserById.
        // Per evitare N round-trip, qui semplifichiamo: 1 lookup per fan.
        // (Per scale > 1k follower, sostituire con bulk/queue.)
        await Promise.all(activeFans.map(async (fanId) => {
          try {
            const { data: au } = await supabase.auth.admin.getUserById(fanId);
            const email = au?.user?.email;
            if (!email) return;
            await emails.sendBroadcastReceived({
              email,
              name: profMap.get(fanId) || "",
              creator_name: creatorName,
            });
            totalMailed++;
          } catch {}
        }));
      } catch (e) {
        console.warn("[fanout:email]", e.message);
      }
    }

    lastSeen = batch[batch.length - 1].fan_id;
    if (batch.length < FANOUT_PAGE_SIZE) break;
  }

  console.log(`[fanout] broadcast=${broadcast.id} notifications=${totalDelivered} emails=${totalMailed}`);
}
