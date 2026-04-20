import { supabase, hasSupabase } from "./supabase";

async function getUid() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export const notificationsService = {
  async list({ limit = 30 } = {}) {
    if (!hasSupabase) return [];
    const uid = await getUid();
    if (!uid) return [];
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  },

  async unreadCount() {
    if (!hasSupabase) return 0;
    const uid = await getUid();
    if (!uid) return 0;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("read", false);
    return count || 0;
  },

  async markRead(id) {
    if (!hasSupabase) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  },

  async markAllRead() {
    if (!hasSupabase) return;
    const uid = await getUid();
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
  },

  async send({ userId, type, title, body, refId }) {
    if (!hasSupabase || !userId) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      ref_id: refId || null,
    });
  },
};

export const reshareService = {
  async reshare(postId, comment) {
    if (!hasSupabase) return null;
    const uid = await getUid();
    if (!uid) throw new Error("Accesso richiesto");
    const { data, error } = await supabase
      .from("reshares")
      .upsert({ user_id: uid, post_id: postId, comment: comment || null }, { onConflict: "user_id,post_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async hasReshared(postId) {
    if (!hasSupabase) return false;
    const uid = await getUid();
    if (!uid) return false;
    const { count } = await supabase
      .from("reshares")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("post_id", postId);
    return (count || 0) > 0;
  },

  async remove(postId) {
    if (!hasSupabase) return;
    const uid = await getUid();
    if (!uid) return;
    await supabase.from("reshares").delete().eq("user_id", uid).eq("post_id", postId);
  },
};
