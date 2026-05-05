import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// =============================================================================
// Test fixtures helper. Crea/distrugge utenti via service-role admin API.
// Niente UI — operazioni server-side dirette per setup deterministici.
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Tests richiedono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in env.\n" +
    "Esporta da .env del server: source server/.env && export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const adminSupabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Generates a unique test email (epoch + random) for clean fixture isolation.
export function uniqueEmail(prefix = "e2e"): string {
  const r = Math.floor(Math.random() * 100000).toString(36);
  return `${prefix}-${Date.now()}-${r}@menia.test`;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

// Creates an auto-confirmed user via admin API (skip email confirmation flow).
// `role`: "fan" | "creator". Defaults to "fan".
// Se `noSubscription=true`, rimuove la trial-subscription auto-creata da
// handle_new_user trigger (utile per testare il flow FREE in isolation).
export async function createTestUser(
  role: "fan" | "creator" = "fan",
  password = "TestPass123!",
  options: { noSubscription?: boolean } = {}
): Promise<TestUser> {
  const email = uniqueEmail(role);
  const dob16 = new Date(Date.now() - 18 * 365 * 86400000).toISOString().slice(0, 10);

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: `E2E ${role}`,
      date_of_birth: dob16,
    },
  });
  if (error || !data.user) throw new Error(`createTestUser: ${error?.message || "no user"}`);

  // Attendi che il trigger handle_new_user crei la profile row, poi settagli il role
  await new Promise((r) => setTimeout(r, 600));
  await adminSupabase.from("profiles").update({
    role,
    full_name: `E2E ${role}`,
    age_verified: true,
    age_verified_at: new Date().toISOString(),
    date_of_birth: dob16,
    onboarding_complete: true,
  }).eq("id", data.user.id);

  // Se richiesto FREE, rimuove la trial-subscription auto-creata.
  if (options.noSubscription) {
    await adminSupabase
      .from("platform_subscriptions")
      .delete()
      .eq("user_id", data.user.id);
  }

  return { id: data.user.id, email, password };
}

// Hard-delete a test user + cascade rows.
export async function deleteTestUser(userId: string) {
  // Service role admin delete elimina anche le righe correlate via FK CASCADE
  await adminSupabase.auth.admin.deleteUser(userId).catch(() => {});
}

// Crea una platform_subscription "active" per un utente — simula stato post-checkout.
export async function activateSubscription(userId: string) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 86400000);
  await adminSupabase.from("platform_subscriptions").upsert({
    user_id: userId,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    external_provider: "test",
    external_subscription_id: `sub_test_${userId.slice(0, 8)}`,
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
}

// Firma un payload Stripe-style. Restituisce header value per "stripe-signature".
// Se WEBHOOK_SECRET non è settato, ritorna stringa vuota (server in mock mode).
export function stripeSignature(rawBody: string, secret = process.env.STRIPE_WEBHOOK_SECRET || ""): string {
  if (!secret) return "";
  const ts = Math.floor(Date.now() / 1000);
  const signed = `${ts}.${rawBody}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${ts},v1=${sig}`;
}

// Trova un corso GRATIS con almeno una lezione locked (non preview) per
// testare il gating platform-subscription. Filtra price=0 perché i corsi
// a pagamento (price>0) sono gated separatamente da course_access — il
// platform sub non li sblocca (vedi server/courses.js gating policy).
export async function findLockedLessonInPublishedCourse(): Promise<{ courseId: string; lessonId: string } | null> {
  const { data: courses } = await adminSupabase
    .from("courses")
    .select("id")
    .eq("is_published", true)
    .or("price.is.null,price.eq.0")
    .limit(20);
  if (!courses?.length) return null;

  for (const c of courses) {
    const { data: lessons } = await adminSupabase
      .from("course_lessons")
      .select("id, is_preview")
      .eq("course_id", c.id);
    const locked = lessons?.find((l) => !l.is_preview);
    if (locked) return { courseId: c.id, lessonId: locked.id };
  }
  return null;
}
