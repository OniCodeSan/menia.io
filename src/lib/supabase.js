import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anonKey);

if (!hasSupabase && typeof window !== "undefined") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurate. " +
      "Il backend remoto è disabilitato — creare un progetto e copiare le chiavi in .env.local."
  );
}

const AUTH_CONFIG = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: "tokaro:sb",
  flowType: "implicit",
};

let _supabase = null;
let _healthy = false;

if (hasSupabase) {
  try {
    _supabase = createClient(url, anonKey, { auth: AUTH_CONFIG });
  } catch (err) {
    console.error("[supabase] createClient failed — falling back to offline mode:", err);
    _supabase = null;
  }
}

if (_supabase) {
  Promise.resolve()
    .then(() => _supabase.auth.getSession())
    .then(() => {
      _healthy = true;
    })
    .catch((err) => {
      console.error("[supabase] auth smoke-test FAILED:", err?.message || err);
      console.error("[supabase] Auth is broken — clearing session and reloading.");
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("tokaro:sb"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      _healthy = false;
    });
}

export const supabase = _supabase;
export const isSupabaseHealthy = () => _healthy;

