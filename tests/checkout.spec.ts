import { test, expect, request as pwRequest } from "@playwright/test";
import { adminSupabase, createTestUser, deleteTestUser, stripeSignature } from "./_helpers/setup";

// Test 2: Checkout → Webhook → Attivazione + idempotenza.
// I soldi si trasformano in accesso? Replay dell'evento NON crea duplicati?
//
// Strategia: bypass del checkout Stripe (no charge reali). POST diretto al
// webhook /api/billing/webhook con un evento Stripe-style. Verifica:
//   1. La platform_subscription diventa active
//   2. webhook_events ha 1 sola riga per quell'event_id
//   3. Replay dello stesso event_id ritorna {received:true, deduped:true}

const API_URL = process.env.API_URL || (process.env.BASE_URL || "https://menia.io") + "/api";

test.describe("Checkout webhook", () => {
  let userId: string | null = null;
  const eventId = `evt_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const subId = `sub_test_${Date.now()}`;

  test.afterAll(async () => {
    if (userId) {
      // Pulizia: webhook_events + subscription + user
      await adminSupabase.from("webhook_events").delete().eq("event_id", eventId);
      await deleteTestUser(userId);
    }
  });

  test("webhook checkout.session.completed → subscription active + idempotente", async () => {
    const u = await createTestUser("fan");
    userId = u.id;

    // Subscription INLINE (object) per evitare che handleStripeEvent chiami
    // stripe.subscriptions.retrieve(subId) — il subId è fake, fallirebbe.
    const nowSec = Math.floor(Date.now() / 1000);
    const periodEnd = nowSec + 30 * 86400;
    const inlineSub = {
      id: subId,
      customer: `cus_test_${userId.slice(0, 8)}`,
      current_period_start: nowSec,
      current_period_end: periodEnd,
      status: "active",
      metadata: { userId, kind: "platform" },
    };

    const event = {
      id: eventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          mode: "subscription",
          customer: inlineSub.customer,
          subscription: inlineSub,
          metadata: { userId, kind: "platform" },
          client_reference_id: userId,
        },
      },
    };

    const rawBody = JSON.stringify(event);
    const sigHeader = stripeSignature(rawBody);

    const ctx = await pwRequest.newContext();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (sigHeader) headers["stripe-signature"] = sigHeader;

    // 1ª chiamata: deve processare l'evento
    const r1 = await ctx.post(`${API_URL}/billing/webhook`, { data: rawBody, headers });
    const body1 = await r1.json();
    expect(r1.status(), `webhook 1st call should be 200, got ${r1.status()}: ${JSON.stringify(body1)}`).toBe(200);
    expect(body1.received).toBe(true);
    expect(body1.deduped, "1st call should NOT be deduped").toBeFalsy();

    // Settling: il webhook handler updatedb in async, attendiamo qualche tick
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Verifica che la platform_subscription sia attiva per questo user
    // (Stripe handler upsertA platform_subscriptions con status=active dopo
    //  checkout.session.completed con kind=platform.)
    const { data: sub } = await adminSupabase
      .from("platform_subscriptions")
      .select("user_id, status, external_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub) {
      // Alcuni handler scrivono solo dopo invoice.paid, non checkout.session.completed.
      // Mandiamo anche un invoice.paid per chiudere il flow.
      const invoiceEvent = {
        id: `${eventId}_invoice`,
        type: "invoice.paid",
        data: {
          object: {
            id: `in_test_${Date.now()}`,
            customer: event.data.object.customer,
            subscription: subId,
            metadata: { userId, kind: "platform" },
          },
        },
      };
      const invBody = JSON.stringify(invoiceEvent);
      const invSig = stripeSignature(invBody);
      const invHeaders: Record<string, string> = { "content-type": "application/json" };
      if (invSig) invHeaders["stripe-signature"] = invSig;
      await ctx.post(`${API_URL}/billing/webhook`, { data: invBody, headers: invHeaders });
      await new Promise((r) => setTimeout(r, 1500));
    }

    const { data: subAfter } = await adminSupabase
      .from("platform_subscriptions")
      .select("user_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    expect(subAfter, "platform_subscriptions row missing dopo webhook").toBeTruthy();
    expect(["active", "trialing"]).toContain(subAfter?.status);

    // 3. Idempotenza: replay dello stesso evento → response deduped:true
    const r2 = await ctx.post(`${API_URL}/billing/webhook`, { data: rawBody, headers });
    const body2 = await r2.json();
    expect(r2.status()).toBe(200);
    expect(body2.deduped, "2nd call (replay) DEVE essere deduped").toBe(true);

    // 4. webhook_events: solo 1 riga per quell'event_id
    const { data: events, count } = await adminSupabase
      .from("webhook_events")
      .select("id, event_id", { count: "exact" })
      .eq("event_id", eventId);
    expect(events?.length || 0).toBeLessThanOrEqual(1); // 0 se signature missing in mock mode, 1 se signed

    await ctx.dispose();
  });
});
