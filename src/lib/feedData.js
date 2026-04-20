import { supabase, hasSupabase } from "./supabase";

// =============================================================================
// Dati di supporto al feed engine: creator_scores, user_profiles, content_behaviors
// Supabase-backed con fallback localStorage/in-memory per dev senza backend.
// =============================================================================

const LS_KEY = {
  creatorScores: "tokaro:creator_scores",
  userProfiles: "tokaro:user_profiles",
  contentBehaviors: "tokaro:content_behaviors",
};

const read = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

const NEW_CREATOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

const supabaseImpl = {
  async listCreatorScores(limit = 100) {
    // Fonte primaria: profiles (un creator reale non deve dipendere da
    // una riga in creator_scores, che viene popolata solo dal job di ranking).
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, handle, avatar_url, cover_url, bio, created_at")
      .eq("role", "creator")
      .limit(limit);
    if (pErr) { console.warn("[feedData] listCreators profiles", pErr.message); return []; }

    // Enrichment best-effort: se creator_scores ha dati, li uniamo.
    const { data: scores } = await supabase.from("creator_scores").select("*");
    const scoreMap = new Map((scores || []).map((s) => [s.creator_id, s]));

    const now = Date.now();
    return (profiles || []).map((p) => {
      const s = scoreMap.get(p.id) || {};
      const payload = s.payload || {};
      const createdMs = p.created_at ? new Date(p.created_at).getTime() : now;
      return {
        creator_id: p.id,
        creator_name: p.full_name || p.handle || "Creator",
        creator_handle: p.handle,
        avatar_url: p.avatar_url,
        cover_url: p.cover_url || null,
        bio: p.bio,
        tags: payload.tags || [],
        global_conversion_rate: s.global_conversion_rate ?? 0,
        global_avg_spend: payload.global_avg_spend ?? 0,
        content_freshness_score: payload.content_freshness_score ?? 0,
        is_new_creator: (now - createdMs) < NEW_CREATOR_WINDOW_MS,
        is_live: payload.is_live ?? false,
        live_viewers: payload.live_viewers ?? 0,
        boost_active: payload.boost_active ?? false,
        boost_multiplier: payload.boost_multiplier ?? 1,
        onboarding_boost: payload.onboarding_boost ?? false,
      };
    });
  },

  async getUserProfile(userId, email) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.warn("[feedData] getUserProfile", error.message);
    if (data) return data;
    const { data: created, error: insErr } = await supabase
      .from("user_profiles")
      .insert({ user_id: userId, user_email: email || null, preferences: {} })
      .select()
      .maybeSingle();
    if (insErr) { console.warn("[feedData] insert user_profiles", insErr.message); return null; }
    return created;
  },

  async updateUserProfile(profileId, patch) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select()
      .maybeSingle();
    if (error) { console.warn("[feedData] updateUserProfile", error.message); return null; }
    return data;
  },

  async listBehaviors(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("content_behaviors")
      .select("*")
      .eq("user_id", userId);
    if (error) { console.warn("[feedData] listBehaviors", error.message); return []; }
    return data || [];
  },

  async upsertBehavior(userId, creatorId, patch) {
    if (!userId || !creatorId) return null;
    const { data: existing } = await supabase
      .from("content_behaviors")
      .select("*")
      .eq("user_id", userId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (existing) {
      const merged = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("content_behaviors")
        .update(merged)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      if (error) console.warn("[feedData] update behavior", error.message);
      return data;
    }

    const { data, error } = await supabase
      .from("content_behaviors")
      .insert({ user_id: userId, creator_id: creatorId, ...patch })
      .select()
      .maybeSingle();
    if (error) console.warn("[feedData] insert behavior", error.message);
    return data;
  },
};

const localImpl = {
  async listCreatorScores() {
    return read(LS_KEY.creatorScores);
  },
  async getUserProfile(userId, email) {
    if (!userId) return null;
    const rows = read(LS_KEY.userProfiles);
    let p = rows.find((r) => r.user_id === userId);
    if (!p) {
      p = {
        id: uid(),
        user_id: userId,
        user_email: email || null,
        segment: "lurker",
        preferences: {},
        declared_interests: [],
        implicit_interests: [],
        total_spent_tokens: 0,
        created_at: new Date().toISOString(),
      };
      rows.push(p);
      write(LS_KEY.userProfiles, rows);
    }
    return p;
  },
  async updateUserProfile(profileId, patch) {
    const rows = read(LS_KEY.userProfiles);
    const idx = rows.findIndex((r) => r.id === profileId);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
    write(LS_KEY.userProfiles, rows);
    return rows[idx];
  },
  async listBehaviors(userId) {
    return read(LS_KEY.contentBehaviors).filter((b) => b.user_id === userId);
  },
  async upsertBehavior(userId, creatorId, patch) {
    const rows = read(LS_KEY.contentBehaviors);
    const idx = rows.findIndex((r) => r.user_id === userId && r.creator_id === creatorId);
    if (idx === -1) {
      const row = { id: uid(), user_id: userId, creator_id: creatorId, ...patch, created_at: new Date().toISOString() };
      rows.push(row);
      write(LS_KEY.contentBehaviors, rows);
      return row;
    }
    rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
    write(LS_KEY.contentBehaviors, rows);
    return rows[idx];
  },
};

export const feedData = hasSupabase ? supabaseImpl : localImpl;
