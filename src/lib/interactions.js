import { supabase, hasSupabase } from "./supabase";

const LS_LIKES = "tokaro:post_likes";
const LS_COMMENTS = "tokaro:post_comments";

const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

async function getUid() {
  if (!hasSupabase) return "local";
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export const interactionsService = {
  // ── Likes ──────────────────────────────────────────────────────────

  async toggleLike(postId) {
    const uid = await getUid();
    if (!uid) throw new Error("Accesso richiesto");

    if (!hasSupabase) {
      const rows = readLS(LS_LIKES);
      const idx = rows.findIndex(r => r.post_id === postId && r.user_id === uid);
      if (idx !== -1) { rows.splice(idx, 1); writeLS(LS_LIKES, rows); return { liked: false }; }
      rows.push({ id: crypto.randomUUID(), post_id: postId, user_id: uid, created_at: new Date().toISOString() });
      writeLS(LS_LIKES, rows);
      return { liked: true };
    }

    const { count } = await supabase
      .from("post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("user_id", uid);

    if (count && count > 0) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", uid);
      if (error) throw new Error(error.message);
      return { liked: false };
    }

    const { error } = await supabase
      .from("post_likes")
      .upsert({ post_id: postId, user_id: uid }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { liked: true };
  },

  async getLikeStatus(postIds) {
    const uid = await getUid();
    if (!uid || !postIds?.length) return new Set();

    if (!hasSupabase) {
      const rows = readLS(LS_LIKES);
      return new Set(rows.filter(r => r.user_id === uid && postIds.includes(r.post_id)).map(r => r.post_id));
    }

    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", uid)
      .in("post_id", postIds);

    return new Set((data || []).map(r => r.post_id));
  },

  // ── Comments ───────────────────────────────────────────────────────

  async listComments(postId) {
    if (!hasSupabase) {
      return readLS(LS_COMMENTS)
        .filter(r => r.post_id === postId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    const { data: comments, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) { console.warn("[interactions] listComments", error.message); return []; }
    if (!comments?.length) return [];

    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, handle, avatar_url")
      .in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return comments.map(c => ({
      ...c,
      user: profileMap.get(c.user_id) || { id: c.user_id, full_name: "Utente", handle: null, avatar_url: null },
    }));
  },

  async addComment(postId, body, parentId = null) {
    if (!body?.trim()) throw new Error("Commento vuoto");
    const uid = await getUid();
    if (!uid) throw new Error("Accesso richiesto");

    if (!hasSupabase) {
      const rows = readLS(LS_COMMENTS);
      const row = { id: crypto.randomUUID(), post_id: postId, user_id: uid, body: body.trim(), parent_id: parentId, created_at: new Date().toISOString() };
      rows.push(row);
      writeLS(LS_COMMENTS, rows);
      return row;
    }

    const payload = { post_id: postId, user_id: uid, body: body.trim() };
    if (parentId) payload.parent_id = parentId;

    const { data, error } = await supabase
      .from("post_comments")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, handle, avatar_url")
      .eq("id", uid)
      .maybeSingle();

    return { ...data, user: profile || { id: uid, full_name: "Utente" } };
  },

  async deleteComment(commentId) {
    const uid = await getUid();
    if (!uid) throw new Error("Accesso richiesto");

    if (!hasSupabase) {
      const rows = readLS(LS_COMMENTS).filter(r => r.id !== commentId);
      writeLS(LS_COMMENTS, rows);
      return;
    }
    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", uid);
    if (error) throw new Error(error.message);
  },
};
