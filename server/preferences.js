// =============================================================================
// Notification preferences — mute creator (anti-spam broadcast).
// =============================================================================

const express = require("express");
const access = require("./access");

module.exports = function createPreferencesRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  router.get("/me", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { data, error } = await supabase
      .from("notification_preferences").select("*")
      .eq("user_id", user.id);
    if (error) {
      console.error("[preferences:me]", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ preferences: data || [] });
  });

  router.post("/mute/:creatorId", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { creatorId } = req.params;
    if (!access.isUuid(creatorId)) return res.status(400).json({ error: "creatorId non valido" });
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: user.id, creator_id: creatorId, type: "broadcast", muted: true,
    }, { onConflict: "user_id,creator_id,type" });
    if (error) {
      console.error("[preferences:mute]", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ muted: true });
  });

  router.delete("/mute/:creatorId", async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    const { creatorId } = req.params;
    if (!access.isUuid(creatorId)) return res.status(400).json({ error: "creatorId non valido" });
    const { error } = await supabase.from("notification_preferences").delete()
      .eq("user_id", user.id).eq("creator_id", creatorId).eq("type", "broadcast");
    if (error) {
      console.error("[preferences:unmute]", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ muted: false });
  });

  return router;
};
