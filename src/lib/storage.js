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

// Magic-byte signatures — validates actual file content, not just MIME header
const MAGIC_SIGS = [
  { mime: "image/jpeg",  bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/png",   bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/gif",   bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp",  offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  { mime: "video/mp4",   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "video/webm",  bytes: [0x1A, 0x45, 0xDF, 0xA3] },
  { mime: "video/quicktime", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "audio/mpeg",  bytes: [0xFF, 0xFB] },
  { mime: "audio/mpeg",  bytes: [0x49, 0x44, 0x33] },
  { mime: "audio/wav",   bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/ogg",   bytes: [0x4F, 0x67, 0x67, 0x53] },
];

async function validateMagicBytes(file) {
  // SVG is text-based, skip binary check
  if (file.type === "image/svg+xml") return true;
  const headerSize = 16;
  const buf = new Uint8Array(await file.slice(0, headerSize).arrayBuffer());
  return MAGIC_SIGS.some((sig) => {
    const off = sig.offset || 0;
    return sig.bytes.every((b, i) => buf[off + i] === b);
  });
}

export const storageService = {
  async upload(file, folder = "uploads") {
    if (!file) throw new Error("Nessun file");
    if (!ALLOWED_TYPES.test(file.type)) throw new Error("Tipo file non consentito");
    if (file.size > MAX_SIZE) throw new Error("File troppo grande (max 200MB)");
    if (!(await validateMagicBytes(file))) throw new Error("Il contenuto del file non corrisponde al tipo dichiarato");

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
