import { supabase, hasSupabase } from "./supabase";

// no-op tracker (analytics module removed in T1 refactor)
const trackEvent = () => {};

// =============================================================================
// Supabase-backed auth with localStorage fallback for dev without credentials.
// Safety: every Supabase call goes through safeCall() which catches structural
// errors (e.g. "this.lock is not a function") and prevents silent cascading.
// =============================================================================

let _authBroken = false;
export const isAuthBroken = () => _authBroken;

// Mappa gli errori comuni di Supabase Auth a messaggi human-readable in italiano.
// Se non c'è una mappatura precisa, ritorna il messaggio originale (per debug).
function humanizeAuthError(error) {
  if (!error) return "Errore inatteso";
  const msg = (error.message || "").toLowerCase();
  const code = error.code || error.error_code || "";

  if (msg.includes("rate limit") || msg.includes("too many requests") || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Troppi tentativi. Riprova tra qualche minuto.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered") || code === "user_already_exists") {
    return "Questa email è già registrata. Prova ad accedere o a recuperare la password.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid_grant") || code === "invalid_credentials") {
    return "Email o password non corretti.";
  }
  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Devi confermare la tua email prima di accedere. Controlla la posta.";
  }
  if (msg.includes("password") && (msg.includes("short") || msg.includes("weak") || msg.includes("at least"))) {
    return "Password troppo debole. Usa almeno 8 caratteri.";
  }
  if (msg.includes("invalid") && msg.includes("email")) {
    return "Email non valida. Controlla l'indirizzo inserito.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Connessione assente o instabile. Riprova.";
  }
  if (msg.includes("database error")) {
    return "Errore interno. Riprova o contatta il supporto.";
  }
  // Default: messaggio neutro che non rivela tecnologie sottostanti
  return error.message || "Errore inatteso. Riprova.";
}

async function safeCall(label, fn) {
  try {
    return await fn();
  } catch (err) {
    const msg = err?.message || String(err);
    const isStructural =
      msg.includes("is not a function") ||
      msg.includes("is not defined") ||
      msg.includes("Cannot read properties of") ||
      msg.includes("Cannot read property");
    if (isStructural) {
      console.error(`[auth] STRUCTURAL ERROR in ${label}:`, msg);
      _authBroken = true;
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("menia:sb"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      throw new Error(
        "Errore interno di autenticazione. Ricarica la pagina. Se il problema persiste, cancella i dati del sito."
      );
    }
    throw err;
  }
}


// Sync session reader: usato da AuthContext lazy initializer per popolare
// `user` PRIMA del primo render. Bypassa qualsiasi await/microtask. Senza
// questo, anche con meFast() veloce, il primo render ha user=null e i
// componenti devono attendere un re-render prima di lanciare le query.
export function readSyncSessionUser() {
  try {
    if (typeof localStorage === "undefined") return null;
    let raw = localStorage.getItem("menia:sb");
    if (!raw) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("menia:")) {
          const v = localStorage.getItem(k);
          if (v && v.includes("access_token")) { raw = v; break; }
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.access_token ? parsed : (parsed?.currentSession || null);
    if (!session?.user?.id) return null;
    return profileToUser(session.user, null);
  } catch {
    return null;
  }
}

// -------- Normalizer: Supabase user → app user shape -----------------------
const profileToUser = (authUser, profile) => {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
    handle: profile?.handle || null,
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || null,
    cover_url: profile?.cover_url || null,
    role: profile?.role || authUser.user_metadata?.role || "fan",
    plan: profile?.plan || "free",
    onboarding_complete: profile?.onboarding_complete ?? false,
    created_at: profile?.created_at || authUser.created_at,
  };
};

let _profileCache = { id: null, data: null, ts: 0 };
// In-flight dedup: se 3 chiamate concorrenti partono prima che la prima
// risponda, tutte vedono cache vuota — questa promise condivisa evita
// 3 round-trip identici.
let _profileInFlight = null;
// Profili cambiano raramente (solo via settings/onboarding). 5 min limita
// le chiamate ridondanti durante navigazione veloce; updateMe forza skipCache.
const PROFILE_CACHE_TTL = 5 * 60_000;

const loadProfile = async (authUser, { skipCache = false } = {}) => {
  if (!authUser) return null;

  if (!skipCache && _profileCache.id === authUser.id && Date.now() - _profileCache.ts < PROFILE_CACHE_TTL) {
    return profileToUser(authUser, _profileCache.data);
  }

  if (!skipCache && _profileInFlight && _profileInFlight.id === authUser.id) {
    const data = await _profileInFlight.promise;
    return profileToUser(authUser, data);
  }

  const promise = (async () => {
    const query = supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
    const { data, error } = await Promise.race([
      query,
      new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 15000)),
    ]);
    if (error) console.warn("[auth] loadProfile", error.message);
    if (data) {
      _profileCache = { id: authUser.id, data, ts: Date.now() };
    }
    return data || _profileCache.data;
  })();

  _profileInFlight = { id: authUser.id, promise };

  try {
    const data = await promise;
    return profileToUser(authUser, data);
  } finally {
    if (_profileInFlight && _profileInFlight.promise === promise) {
      _profileInFlight = null;
    }
  }
};

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------
const supabaseImpl = {
  async register({ email, password, role = "fan", full_name, date_of_birth }) {
    if (!email || !password) throw new Error("Email e password sono obbligatori");
    if (password.length < 8) throw new Error("La password deve avere almeno 8 caratteri");
    if (!date_of_birth) throw new Error("Data di nascita obbligatoria");
    const normalizedEmail = email.trim().toLowerCase();

    return safeCall("register", async () => {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role,
            full_name: full_name || normalizedEmail.split("@")[0],
            date_of_birth,
          },
        },
      });
      if (error) throw new Error(humanizeAuthError(error));
      if (!data.user) throw new Error("Registrazione non completata");

      supabase.from("profiles").update({
        age_verified: true,
        age_verified_at: new Date().toISOString(),
        date_of_birth,
        role,
      }).eq("id", data.user.id).then(() => {}).catch(() => {});

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch("/api/send-welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }).catch(() => {});
      }

      trackEvent("Signup", { role });
      return await loadProfile(data.user, { skipCache: true });
    });
  },

  async login({ email, password }) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    return safeCall("login", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw new Error(humanizeAuthError(error));
      return await loadProfile(data.user, { skipCache: true });
    });
  },

  async logout() {
    _profileCache = { id: null, data: null, ts: 0 };
    return safeCall("logout", () => supabase.auth.signOut());
  },

  async me() {
    return safeCall("me", async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      return await loadProfile(session.user);
    });
  },

  // meFast() pure: legge la session direttamente dal localStorage senza
  // attraversare il SDK async. Bypassa la coda di microtask di Supabase e
  // ritorna in microsecondi sul cold start. Fallback a getSession se il
  // formato di storage cambia o non è disponibile.
  // NB: con `storageKey: "menia:sb"` (vedi lib/supabase.js) la chiave reale
  // è esattamente "menia:sb" — Supabase NON aggiunge il suffisso -auth-token.
  async meFast() {
    try {
      if (typeof localStorage !== "undefined") {
        // Cerchiamo prima la chiave esatta; fallback su qualsiasi chiave
        // "menia:*" che contenga un access_token (resilienza al rename).
        let raw = localStorage.getItem("menia:sb");
        if (!raw) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("menia:")) {
              const v = localStorage.getItem(k);
              if (v && v.includes("access_token")) { raw = v; break; }
            }
          }
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          const session = parsed?.access_token ? parsed : (parsed?.currentSession || null);
          if (session?.user?.id) {
            return profileToUser(session.user, _profileCache.data);
          }
        }
      }
      // Fallback: SDK path
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      return profileToUser(session.user, _profileCache.data);
    } catch {
      return null;
    }
  },

  async updateMe(patch) {
    return safeCall("updateMe", async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) throw new Error("Nessun utente autenticato");
      const ALLOWED = ["full_name", "handle", "bio", "category", "avatar_url", "cover_url", "notification_prefs", "onboarding_complete"];
      const safe = {};
      for (const k of ALLOWED) {
        if (k in patch) safe[k] = patch[k];
      }
      safe.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .update(safe)
        .eq("id", session.user.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return profileToUser(session.user, data);
    });
  },

  async isHandleAvailable(handle) {
    if (!handle) return false;
    return safeCall("isHandleAvailable", async () => {
      const { data: session } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      if (error) return false;
      if (!data) return true;
      return data.id === session.user?.id;
    });
  },

  async sendPasswordReset(email) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Inserisci la tua email");
    return safeCall("sendPasswordReset", async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(humanizeAuthError(error));
    });
  },

  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 8) throw new Error("La password deve avere almeno 8 caratteri");
    return safeCall("updatePassword", async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(humanizeAuthError(error));
    });
  },

  onAuthChange(cb) {
    try {
      // Supabase può emettere più eventi ravvicinati su cold start
      // (INITIAL_SESSION + TOKEN_REFRESHED + SIGNED_IN). Senza filtro,
      // ognuno scatena un loadProfile. Skippiamo se per lo stesso user
      // abbiamo già un fetch in volo o un dato fresco entro PROFILE_CACHE_TTL.
      let lastLoadedAt = 0;
      let lastLoadedId = null;

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // CRITICO: questo handler NON deve await chiamate Postgrest.
        // _recoverAndRefresh() awaita tutti i subscriber prima di sbloccare
        // initializePromise, ma ogni .from() in PostgREST fa fetchWithAuth
        // -> getAccessToken() -> auth.getSession() -> awaita initializePromise.
        // Risultato: deadlock fino al timeout 15s di loadProfile.
        // Fix: deferire loadProfile a un microtask SUCCESSIVO con queueMicrotask
        // (o setTimeout(0)), così _initialize() può completarsi prima.
        if (!session?.user) {
          lastLoadedAt = 0; lastLoadedId = null;
          cb(null);
          return;
        }
        const quickUser = profileToUser(session.user, _profileCache.data);
        cb(quickUser);

        const sameUserFresh =
          lastLoadedId === session.user.id &&
          Date.now() - lastLoadedAt < PROFILE_CACHE_TTL;
        if (sameUserFresh) return;

        // Defer fuori dal contesto di _initialize/_recoverAndRefresh:
        // setTimeout(0) garantisce che initializePromise sia risolto prima
        // che loadProfile chiami supabase.from(...).
        setTimeout(async () => {
          try {
            const fullUser = await loadProfile(session.user);
            lastLoadedAt = Date.now();
            lastLoadedId = session.user.id;
            cb(fullUser);
          } catch (err) {
            console.error("[auth] onAuthChange loadProfile failed:", err);
          }
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    } catch (err) {
      console.error("[auth] onAuthStateChange setup FAILED:", err);
      _authBroken = true;
      return () => {};
    }
  },
};
// ---------------------------------------------------------------------------
export const authService = supabaseImpl;
export const authBackend = "supabase";

