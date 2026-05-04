import { test, expect, request as pwRequest } from "@playwright/test";
import {
  createTestUser, deleteTestUser, activateSubscription,
  findLockedLessonInPublishedCourse,
} from "./_helpers/setup";

// Test 3: Access gating FREE vs PAID.
// Anon/free → bloccato. Paid → accesso reale.
//
// Strategia: usa GET /api/courses/:id che ritorna lessons[] con flag `locked` per
// non-paying users. Questo è il source-of-truth per il content gating server-side.
// Test: un utente non-paying riceve l'oggetto lesson SENZA `body` per le lezioni
// premium, e con `locked:true`. Un utente paying lo riceve completo.

const API_URL = process.env.API_URL || (process.env.BASE_URL || "https://menia.io") + "/api";

async function loginAndGetToken(email: string, password: string): Promise<string> {
  const ctx = await pwRequest.newContext();
  // Usiamo direttamente Supabase Auth REST (lo stesso endpoint che usa il client)
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseAnon) throw new Error("Missing SUPABASE_ANON_KEY in env");

  const r = await ctx.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: supabaseAnon, "content-type": "application/json" },
    data: { email, password },
  });
  const body = await r.json();
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body)}`);
  await ctx.dispose();
  return body.access_token;
}

test.describe("Course access gating", () => {
  let freeUserId: string | null = null;
  let paidUserId: string | null = null;
  let lockedLessonInfo: { courseId: string; lessonId: string } | null = null;

  test.beforeAll(async () => {
    lockedLessonInfo = await findLockedLessonInPublishedCourse();
    if (!lockedLessonInfo) {
      console.warn("⚠ Nessun corso pubblicato con lezione locked trovato — test saltato");
    }
  });

  test.afterAll(async () => {
    if (freeUserId) await deleteTestUser(freeUserId);
    if (paidUserId) await deleteTestUser(paidUserId);
  });

  test("utente FREE non riceve il body delle lezioni locked", async () => {
    test.skip(!lockedLessonInfo, "no published course with locked lesson");

    const free = await createTestUser("fan", "TestPass123!", { noSubscription: true });
    freeUserId = free.id;
    const token = await loginAndGetToken(free.email, free.password);

    const ctx = await pwRequest.newContext();
    const r = await ctx.get(`${API_URL}/courses/${lockedLessonInfo!.courseId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const data = await r.json();

    expect(data.has_access, "FREE user has_access deve essere false").toBeFalsy();
    const lockedLesson = data.lessons.find((l: any) => l.id === lockedLessonInfo!.lessonId);
    expect(lockedLesson, "lezione non trovata nel response").toBeTruthy();
    expect(lockedLesson.locked, "lezione locked flag deve essere true per FREE").toBe(true);
    // Body non deve essere leakato
    expect(
      !lockedLesson.body || lockedLesson.body === "" || lockedLesson.body === null,
      `lezione locked NON deve esporre body — got: ${JSON.stringify(lockedLesson.body)?.slice(0, 100)}`
    ).toBe(true);

    await ctx.dispose();
  });

  test("utente PAID riceve il contenuto completo delle lezioni", async () => {
    test.skip(!lockedLessonInfo, "no published course with locked lesson");

    const paid = await createTestUser("fan");
    paidUserId = paid.id;
    await activateSubscription(paid.id);

    const token = await loginAndGetToken(paid.email, paid.password);
    const ctx = await pwRequest.newContext();
    const r = await ctx.get(`${API_URL}/courses/${lockedLessonInfo!.courseId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const data = await r.json();

    expect(data.has_access, "PAID user has_access deve essere true").toBe(true);
    const lesson = data.lessons.find((l: any) => l.id === lockedLessonInfo!.lessonId);
    expect(lesson).toBeTruthy();
    expect(lesson.locked, "PAID user non deve vedere locked=true").toBeFalsy();
    // Body deve essere disponibile (anche se vuoto, ma il campo presente non null)
    expect("body" in lesson, "PAID lesson deve avere il campo body").toBe(true);

    await ctx.dispose();
  });
});
