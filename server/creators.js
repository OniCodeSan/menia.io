// =============================================================================
// Creators API — public read of profile + creator extras + content counts.
// Single endpoint to feed the CreatorProfile page.
// =============================================================================

const express = require("express");
const access = require("./access");

module.exports = function createCreatorsRouter({ supabase }) {
  const router = express.Router();

  // GET /api/creators/:id — accepts UUID or handle
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== "string" || id.length > 60) {
      return res.status(400).json({ error: "id non valido" });
    }

    const isUuid = access.isUuid(id);
    let profileQuery = supabase
      .from("profiles")
      .select("id, full_name, handle, bio, avatar_url, cover_url, role, created_at")
      .eq("role", "creator");
    profileQuery = isUuid ? profileQuery.eq("id", id) : profileQuery.eq("handle", id);

    const { data: profile, error: profErr } = await profileQuery.maybeSingle();
    if (profErr) {
      console.error("[creators:profile]", profErr.message);
      return res.status(500).json({ error: "Errore caricamento creator" });
    }
    if (!profile) return res.status(404).json({ error: "Creator non trovato" });

    const [creatorExtra, coursesRes, livesRes] = await Promise.all([
      supabase
        .from("creator_profiles")
        .select("bio, monthly_subscription_price, profile_image_url, cover_image_url, channel_name, created_at")
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabase
        .from("courses")
        .select("id, title, description, cover_url, price, external_payment_link, is_published, created_at")
        .eq("creator_id", profile.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("live_events")
        .select("id, title, description, cover_url, scheduled_at, duration_minutes, price, status")
        .eq("creator_id", profile.id)
        .eq("is_published", true)
        .order("scheduled_at", { ascending: true }),
    ]);

    const courses = coursesRes.data || [];
    const lives = livesRes.data || [];

    // Hydrate per-course student counts from `course_access` (enrollments),
    // not `access_logs` (which records every visualization).
    if (courses.length > 0) {
      const ids = courses.map((c) => c.id);
      const { data: enrollRows } = await supabase
        .from("course_access")
        .select("course_id")
        .in("course_id", ids);
      const counts = new Map();
      (enrollRows || []).forEach((r) => counts.set(r.course_id, (counts.get(r.course_id) || 0) + 1));
      courses.forEach((c) => { c.student_count = counts.get(c.id) || 0; });
    }

    return res.json({
      creator: {
        ...profile,
        bio: creatorExtra.data?.bio || profile.bio,
        channel_name: creatorExtra.data?.channel_name || profile.full_name,
        profile_image_url: creatorExtra.data?.profile_image_url || profile.avatar_url,
        cover_image_url: creatorExtra.data?.cover_image_url || profile.cover_url,
        monthly_subscription_price: creatorExtra.data?.monthly_subscription_price ?? null,
      },
      counts: {
        courses: courses.length,
        live_events: lives.length,
      },
      courses,
      lives,
    });
  });

  return router;
};
