import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("[admin] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

let _supabase = null;
try {
  _supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "menia:admin",
      flowType: "implicit",
    },
  });
} catch (e) {
  console.error("[admin] createClient failed:", e);
}
export const supabase = _supabase;
