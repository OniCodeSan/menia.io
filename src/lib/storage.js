import { supabase, hasSupabase } from "./supabase";

// =============================================================================
// Storage service — Supabase Storage con fallback base64 per dev.
// Bucket "media" (privato) per contenuti post.
// Bucket "avatars" (pubblico) per avatar e cover.
// =============================================================================

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const slugify = (name) =>
  String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

const ALLOWED_TYPES = /^(image\/(jpeg|png|gif|webp|svg\+xml)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|ogg))$/;
const MAX_SIZE = 200 * 1024 * 1024;

export const storageService = {
  async upload(file, folder = "uploads") {
    if (!file) throw new Error("Nessun file");
    if (!ALLOWED_TYPES.test(file.type)) throw new Error("Tipo file non consentito");
    if (file.size > MAX_SIZE) throw new Error("File troppo grande (max 200MB)");

    const bucket = folder === "avatars" ? "avatars" : "media";

    if (hasSupabase) {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess?.user?.id;
      if (!uid) throw new Error("Autenticazione richiesta per l'upload");
      const path = `${uid}/${folder}/${Date.now()}-${slugify(file.name || "file")}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw new Error(error.message);

      if (bucket === "avatars") {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return { url: data.publicUrl, path };
      }
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      return { url: signed?.signedUrl || "", path };
    }

    const dataUrl = await fileToBase64(file);
    return { url: dataUrl, path: `local/${Date.now()}-${slugify(file.name || "file")}` };
  },

  async getSignedUrl(path, expiresIn = 3600) {
    if (!path || !hasSupabase) return null;
    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUrl(path, expiresIn);
    if (error) {
      console.warn("[storage] signedUrl", error.message);
      return null;
    }
    return data.signedUrl;
  },

  async getSignedUrls(paths, expiresIn = 3600) {
    if (!paths?.length || !hasSupabase) return {};
    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUrls(paths, expiresIn);
    if (error) {
      console.warn("[storage] signedUrls", error.message);
      return {};
    }
    const map = {};
    (data || []).forEach((item) => {
      if (item.signedUrl) map[item.path] = item.signedUrl;
    });
    return map;
  },

  async remove(path) {
    if (!path) return;
    if (!hasSupabase) return;
    const bucket = path.includes("/avatars/") ? "avatars" : "media";
    await supabase.storage.from(bucket).remove([path]);
  },
};
