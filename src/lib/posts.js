import { supabase, hasSupabase } from "./supabase";
import { storageService } from "./storage";
import { canCreatorUse } from "./plans";

// =============================================================================
// Posts service — contenuti pubblicati dai creator.
// Tabella public.posts (vedi supabase/posts.sql).
// =============================================================================

const localKey = "tokaro:posts";
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(localKey) || "[]"); } catch { return []; }
};
const writeLocal = (rows) => localStorage.setItem(localKey, JSON.stringify(rows));

export const postsService = {
  async create({ type, access, title, description, media_url, media_path, price }) {
    if (!title?.trim()) throw new Error("Titolo obbligatorio");

    if (!hasSupabase) {
      const rows = readLocal();
      const row = {
        id: crypto.randomUUID(),
        creator_id: "local",
        type, access, title, description, media_url, media_path,
        price: price ? Number(price) : null,
        created_at: new Date().toISOString(),
      };
      rows.unshift(row);
      writeLocal(rows);
      return row;
    }

    const { data: sess } = await supabase.auth.getUser();
    if (!sess?.user) throw new Error("Nessun utente autenticato");

    if (access && access !== "public") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", sess.user.id)
        .maybeSingle();
      if (!canCreatorUse("publish_premium_content", profile?.plan)) {
        throw new Error("Il tuo piano non consente contenuti riservati. Passa al piano Start o Pro.");
      }
    }

    const payload = {
      creator_id: sess.user.id,
      type,
      access,
      title: title.trim(),
      description: description?.trim() || null,
      media_url: media_url || null,
      media_path: media_path || null,
      price: price ? Number(price) : null,
    };

    const { data, error } = await supabase
      .from("posts")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listMine({ limit = 50 } = {}) {
    if (!hasSupabase) return readLocal();

    const { data: sess } = await supabase.auth.getUser();
    if (!sess?.user) return [];

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", sess.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("[posts] listMine", error.message);
      return [];
    }
    if (!data?.length) return [];

    const mediaPaths = data.filter((p) => p.media_path).map((p) => p.media_path);
    const signedMap = mediaPaths.length > 0 ? await storageService.getSignedUrls(mediaPaths) : {};

    return data.map((p) => ({
      ...p,
      media_url: (p.media_path && signedMap[p.media_path]) || p.media_url,
    }));
  },

  async listPublic({ limit = 50, offset = 0, access } = {}) {
    if (!hasSupabase) {
      let rows = readLocal();
      if (access) rows = rows.filter((p) => p.access === access);
      return rows.slice(offset, offset + limit).map((p) => ({
        ...p,
        creator: { id: p.creator_id, full_name: "Local Creator", handle: null, avatar_url: null },
      }));
    }

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (access) query = query.eq("access", access);

    const { data: posts, error } = await query;
    if (error) {
      console.warn("[posts] listPublic", error.message);
      return [];
    }
    if (!posts?.length) return [];

    const creatorIds = [...new Set(posts.map((p) => p.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, handle, avatar_url")
      .in("id", creatorIds);
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const mediaPaths = posts.filter((p) => p.media_path).map((p) => p.media_path);
    const signedMap = mediaPaths.length > 0 ? await storageService.getSignedUrls(mediaPaths) : {};

    return posts.map((p) => ({
      ...p,
      media_url: (p.media_path && signedMap[p.media_path]) || p.media_url,
      creator: profileMap.get(p.creator_id) || { id: p.creator_id, full_name: "Creator", handle: null, avatar_url: null },
    }));
  },

  async remove(id) {
    if (!id) return;
    if (!hasSupabase) {
      writeLocal(readLocal().filter((p) => p.id !== id));
      return;
    }
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) throw new Error("Autenticazione richiesta");
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("creator_id", uid);
    if (error) throw new Error(error.message);
  },
};

