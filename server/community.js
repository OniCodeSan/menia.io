// =============================================================================
// Community API — list a creator's community posts.
// Public posts visible to everyone; subscribers-only posts gated by an active
// subscription (no tier).
// =============================================================================

const express = require("express");
const access = require("./access");

module.exports = function createCommunityRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  // GET /api/community/:creator_id
  router.get("/:creator_id", async (req, res) => {
    const { creator_id } = req.params;
    if (!access.isUuid(creator_id)) return res.status(400).json({ error: "creator_id non valido" });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const user = await requireUserJWT(req);
    const userId = user?.id || null;
    const isOwner = userId === creator_id;
    const subscribed = userId && !isOwner
      ? await access.hasActiveSubscription(supabase, userId, creator_id)
      : false;
    const canSeeSubscribersOnly = isOwner || subscribed;

    let q = supabase
      .from("community_posts")
      .select("id, creator_id, title, body, media_url, media_path, is_subscribers_only, created_at, updated_at")
      .eq("creator_id", creator_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (!canSeeSubscribersOnly) q = q.eq("is_subscribers_only", false);

    const { data, error } = await q;
    if (error) {
      console.error("[community:list]", error.message);
      return res.status(500).json({ error: "Errore caricamento community" });
    }

    return res.json({
      posts: data || [],
      is_subscribed: !!subscribed,
      is_owner: !!isOwner,
    });
  });

  // POST /api/community/posts — creator publishes a community post
  router.post("/posts", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });

    const { title, body, media_url, media_path, is_subscribers_only } = req.body || {};
    if (!title && !body) return res.status(400).json({ error: "title o body obbligatori" });
    if (title !== undefined && title !== null) {
      if (typeof title !== "string" || title.length > 200) {
        return res.status(400).json({ error: "title non valido (max 200)" });
      }
    }
    if (body !== undefined && body !== null) {
      if (typeof body !== "string" || body.length > 10000) {
        return res.status(400).json({ error: "body non valido (max 10000)" });
      }
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        creator_id: user.id,
        title: title?.trim() || null,
        body: body?.trim() || null,
        media_url: media_url || null,
        media_path: media_path || null,
        is_subscribers_only: !!is_subscribers_only,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[community:create]", error.message);
      return res.status(500).json({ error: "Errore creazione post" });
    }
    return res.status(201).json({ post: data });
  });

  // DELETE /api/community/posts/:id — owner deletes
  router.delete("/posts/:id", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { id } = req.params;
    if (!access.isUuid(id)) return res.status(400).json({ error: "id non valido" });

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", id)
      .eq("creator_id", user.id);
    if (error) {
      console.error("[community:delete]", error.message);
      return res.status(500).json({ error: "Errore eliminazione post" });
    }
    return res.json({ ok: true });
  });

  return router;
};
