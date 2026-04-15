import { createClient } from "@supabase/supabase-js";

const env = /** @type {any} */ (import.meta).env || {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anonKey);

if (!hasSupabase && typeof window !== "undefined") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurate. " +
      "Il backend remoto è disabilitato — creare un progetto e copiare le chiavi in .env.local."
  );
}

export const supabase = hasSupabase
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "tokaro:sb",
      },
    })
  : null;

if (typeof window !== "undefined") {
  /** @type {any} */ (window).__tokaroSupabase = supabase;
}
