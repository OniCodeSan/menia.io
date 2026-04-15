import { supabase, hasSupabase } from "./supabase";
import { db, SESSION_KEY } from "./db";

// =============================================================================
// Supabase-backed auth with localStorage fallback for dev without credentials.
// =============================================================================

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
    onboarding_complete: profile?.onboarding_complete ?? false,
    created_at: profile?.created_at || authUser.created_at,
  };
};

const loadProfile = async (authUser) => {
  if (!authUser) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error) console.warn("[auth] loadProfile", error.message);
  return profileToUser(authUser, data);
};

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------
const supabaseImpl = {
  async register({ email, password, role = "fan", full_name }) {
    if (!email || !password) throw new Error("Email e password sono obbligatori");
    if (password.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
    const normalizedEmail = email.trim().toLowerCase();

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

    // Il trigger handle_new_user crea profilo + wallet automaticamente.
    // Se la conferma email è disattivata Supabase restituisce già la session.
    return await loadProfile(data.user);
  },

  async login({ email, password }) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw new Error("Email o password non corretti");
    return await loadProfile(data.user);
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async me() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return await loadProfile(data.user);
  },

  async updateMe(patch) {
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
  },

  async isHandleAvailable(handle) {
    if (!handle) return false;
    const { data: session } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();
    if (error) return false;
    if (!data) return true;
    return data.id === session.user?.id;
  },

  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        cb(null);
      } else {
        const user = await loadProfile(session.user);
        cb(user);
      }
    });
    return () => data.subscription.unsubscribe();
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

if (typeof window !== "undefined") {
  const w = /** @type {any} */ (window);
  w.__tokaroAuth = authService;
  w.__tokaroAuthBackend = authBackend;
}
