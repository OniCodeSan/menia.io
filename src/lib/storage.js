import { supabase, hasSupabase } from "./supabase";

// =============================================================================
// Storage service — Supabase Storage con fallback base64 per dev.
// Usa il bucket "media" (vedi supabase/schema.sql).
// =============================================================================

const BUCKET = "media";

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

export const storageService = {
  /**
   * Upload a file. Returns { url, path } — url is public (Supabase) or data URL (local).
   */
  async upload(file, { folder = "uploads" } = {}) {
    if (!file) throw new Error("Nessun file");

    if (hasSupabase) {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess?.user?.id || "anon";
      const path = `${uid}/${folder}/${Date.now()}-${slugify(file.name || "file")}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, path };
    }

    // Fallback locale (solo dev): ritorna data URL, niente persistenza reale.
    const dataUrl = await fileToBase64(file);
    return { url: dataUrl, path: `local/${Date.now()}-${slugify(file.name || "file")}` };
  },

  async remove(path) {
    if (!path) return;
    if (!hasSupabase) return;
    await supabase.storage.from(BUCKET).remove([path]);
  },
};

if (typeof window !== "undefined") {
  /** @type {any} */ (window).__tokaroStorage = storageService;
}
