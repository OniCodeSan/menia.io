import { supabase, hasSupabase } from "./supabase";
import { db, SESSION_KEY } from "./db";
import { trackEvent } from "./analytics";

// =============================================================================
// Supabase-backed auth with localStorage fallback for dev without credentials.
// Safety: every Supabase call goes through safeCall() which catches structural
// errors (e.g. "this.lock is not a function") and prevents silent cascading.
// =============================================================================

let _authBroken = false;
export const isAuthBroken = () => _authBroken;

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
          .filter((k) => k.startsWith("tokaro:sb"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      throw new Error(
        "Errore interno di autenticazione. Ricarica la pagina. Se il problema persiste, cancella i dati del sito."
      );
    }
    throw err;
  }
}

const toHex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const hashPassword = async (password) => {
  if (!crypto?.subtle) return `plain:${password}`;
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return `sha256:${toHex(digest)}`;
};

const sanitize = (user) => {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
};

const setLocalSession = (userId) => localStorage.setItem(SESSION_KEY, userId);
const getLocalSessionId = () => localStorage.getItem(SESSION_KEY);

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
const PROFILE_CACHE_TTL = 30_000;

const loadProfile = async (authUser, { skipCache = false } = {}) => {
  if (!authUser) return null;

  if (!skipCache && _profileCache.id === authUser.id && Date.now() - _profileCache.ts < PROFILE_CACHE_TTL) {
    return profileToUser(authUser, _profileCache.data);
  }

  const query = supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
  const { data, error } = await Promise.race([
    query,
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 15000)),
  ]);
  if (error) console.warn("[auth] loadProfile", error.message);

  if (data) {
    _profileCache = { id: authUser.id, data, ts: Date.now() };
  }

  return profileToUser(authUser, data || _profileCache.data);
};

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------
const supabaseImpl = {
  async register({ email, password, role = "fan", full_name }) {
    if (!email || !password) throw new Error("Email e password sono obbligatori");
    if (password.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
    const normalizedEmail = email.trim().toLowerCase();

    return safeCall("register", async () => {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role,
            full_name: full_name || normalizedEmail.split("@")[0],
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Registrazione non completata");

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
      if (error) throw new Error("Email o password non corretti");
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

  async updateMe(patch) {
    return safeCall("updateMe", async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) throw new Error("Nessun utente autenticato");
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
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
      if (error) throw new Error(error.message);
    });
  },

  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
    return safeCall("updatePassword", async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    });
  },

  onAuthChange(cb) {
    try {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          cb(null);
        } else {
          try {
            const user = await loadProfile(session.user);
            cb(user);
          } catch (err) {
            console.error("[auth] onAuthChange loadProfile failed:", err);
            cb(null);
          }
        }
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
// Local fallback (localStorage) — usato se VITE_SUPABASE_* non configurate.
// ---------------------------------------------------------------------------
const localImpl = {
  async register({ email, password, role = "fan", full_name, ...extra }) {
    if (!email || !password) throw new Error("Email e password sono obbligatori");
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.find((u) => u.email === normalizedEmail)) {
      throw new Error("Esiste già un account con questa email");
    }
    if (password.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
    const password_hash = await hashPassword(password);
    const user = db.users.insert({
      email: normalizedEmail,
      password_hash,
      role,
      full_name: full_name || normalizedEmail.split("@")[0],
      onboarding_complete: role === "fan",
      ...extra,
    });
    db.tokenWallets.insert({
      user_id: user.id,
      wallet_type: "user",
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    });
    setLocalSession(user.id);
    return sanitize(user);
  },

  async login({ email, password }) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === normalizedEmail);
    if (!user) throw new Error("Email o password non corretti");
    const password_hash = await hashPassword(password);
    if (user.password_hash !== password_hash) throw new Error("Email o password non corretti");
    setLocalSession(user.id);
    return sanitize(user);
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  async me() {
    const id = getLocalSessionId();
    if (!id) return null;
    return sanitize(db.users.find((u) => u.id === id));
  },

  async updateMe(patch) {
    const id = getLocalSessionId();
    if (!id) throw new Error("Nessun utente autenticato");
    return sanitize(db.users.update(id, patch));
  },

  async isHandleAvailable(handle) {
    if (!handle) return false;
    const currentId = getLocalSessionId();
    const existing = db.users.find((u) => u.handle === handle);
    if (!existing) return true;
    return existing.id === currentId;
  },

  onAuthChange(cb) {
    const handler = (e) => {
      if (e.key === SESSION_KEY) {
        this.me().then(cb);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

// ---------------------------------------------------------------------------
export const authService = hasSupabase ? supabaseImpl : localImpl;
export const authBackend = hasSupabase ? "supabase" : "local";

