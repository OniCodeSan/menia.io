import { test, expect } from "@playwright/test";
import { uniqueEmail, deleteTestUser, adminSupabase, createTestUser } from "./_helpers/setup";

// Test 1: Signup → Login → Dashboard.
// Verifica che un utente nuovo arrivi davvero in dashboard, con sessione persistita.
//
// NB: se la Supabase Project ha "Confirm email" = ON, signup non porta direttamente
// in dashboard. In quel caso, il fallback testa createUser via admin API + login UI.

test.describe("Auth flow", () => {
  let createdUserId: string | null = null;

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId);
      createdUserId = null;
    }
  });

  // NB: questo test dipende da configurazione Supabase del progetto:
  //   1. "Confirm email" deve essere OFF (altrimenti dopo signup l'utente
  //      resta in "check your email" e non naviga in dashboard)
  //   2. Email rate limit deve avere capacità (default: 4 email/h per IP).
  // In progetti dove queste condizioni non sono garantite (es. produzione con
  // confirm-email ON di default), il test "login con utente esistente" (sotto)
  // copre comunque il path Auth → Dashboard via admin-provisioned user.
  test.fixme("signup → dashboard (path UI completo)", async ({ page }) => {
    const email = uniqueEmail("signup");
    const password = "TestPass123!";

    await page.goto("/student-login?mode=register");
    await page.fill("#fan-name", "E2E Test User");
    await page.fill("#fan-email", email);
    await page.fill("#fan-password", password);
    // Data di nascita: 18 anni fa (ISO yyyy-mm-dd)
    const dob = new Date(Date.now() - 18 * 365 * 86400000).toISOString().slice(0, 10);
    await page.fill("#fan-dob", dob);
    // Radix Checkbox è un <button role="checkbox">. setChecked() è il modo
    // più affidabile (gestisce ARIA correttamente, niente click-coordinate flaky).
    await page.getByRole("checkbox", { name: /termini|accetto/i }).first().check();
    // Settling: attende che il bottone submit non sia più disabled
    await page.locator("button[type='submit']:not([disabled])").waitFor({ timeout: 5000 });
    await page.locator("button[type='submit']").click();

    // Caso A: Supabase confirm-email OFF → naviga direttamente a /student-dashboard
    // Caso B: confirm-email ON → mostra messaggio errore "Devi confermare la tua email..."
    //         in tal caso usciamo "soft": il signup è stato creato, va confermato.
    const result = await Promise.race([
      page.waitForURL(/\/student-dashboard/, { timeout: 15_000 }).then(() => "dashboard"),
      page.waitForSelector("text=/conferma.*email/i", { timeout: 15_000 }).then(() => "confirm-required"),
    ]).catch(() => "timeout");

    // Recupera l'user appena creato per cleanup
    const { data: users } = await adminSupabase.auth.admin.listUsers({ perPage: 50 });
    const u = users?.users?.find((x) => x.email === email);
    if (u) createdUserId = u.id;

    if (result === "confirm-required") {
      console.log("⚠ Supabase confirm-email è ON → il flow signup richiede conferma manuale.");
      console.log("  Per testare end-to-end, disattiva 'Confirm email' nel Supabase Dashboard.");
      test.skip(true, "Supabase confirm-email is ON in this project");
      return;
    }

    expect(result, `Expected signup → dashboard, got "${result}"`).toBe("dashboard");

    // Sessione persistita: localStorage["menia:sb"] presente con access_token
    const session = await page.evaluate(() => {
      const raw = localStorage.getItem("menia:sb");
      return raw ? JSON.parse(raw) : null;
    });
    expect(session?.access_token, "JWT non salvato in localStorage").toBeTruthy();
    expect(session?.user?.email, "User email mismatch").toBe(email);

    // Dashboard root visibile
    await expect(page.locator("[data-test='dashboard-root']")).toBeVisible({ timeout: 10_000 });
  });

  test("login con utente esistente → dashboard", async ({ page }) => {
    // Provisioning admin: utente confermato → testa solo il flow login
    const u = await createTestUser("fan");
    createdUserId = u.id;

    await page.goto("/student-login");
    await page.fill("#fan-email", u.email);
    await page.fill("#fan-password", u.password);
    await page.locator("button[type='submit']").click();

    await page.waitForURL(/\/student-dashboard/, { timeout: 15_000 });
    await expect(page.locator("[data-test='dashboard-root']")).toBeVisible({ timeout: 10_000 });

    const session = await page.evaluate(() => {
      const raw = localStorage.getItem("menia:sb");
      return raw ? JSON.parse(raw) : null;
    });
    expect(session?.access_token).toBeTruthy();
  });
});
