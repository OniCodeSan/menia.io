import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Log every webhook event
  try {
    await base44.asServiceRole.entities.WebhookEvent?.create?.({
      provider: 'stripe',
      event_type: event.type,
      event_id: event.id,
      payload: event.data?.object || {},
      status: 'received',
    });
  } catch (_) { /* table may not exist via base44 entities, ignore */ }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const meta = session.metadata || {};

  if (meta.event_type !== 'token_purchase') {
    return Response.json({ received: true });
  }

  const userId = meta.user_id;
  const userEmail = meta.user_email;
  const tokens = parseInt(meta.tokens, 10);
  const sessionId = session.id;
  const orderId = meta.order_id || null;

  try {
    // Idempotency: check if transaction already exists
    const existing = await base44.asServiceRole.entities.TokenTransaction.filter({
      idempotency_key: sessionId,
    });
    if (existing && existing.length > 0) {
      console.log('Duplicate webhook, skipping:', sessionId);
      return Response.json({ received: true });
    }

    // Find or create wallet
    let wallets = await base44.asServiceRole.entities.TokenWallet.filter({
      user_id: userId, wallet_type: 'user',
    });

    let wallet;
    if (!wallets || wallets.length === 0) {
      wallet = await base44.asServiceRole.entities.TokenWallet.create({
        user_id: userId,
        wallet_type: 'user',
        balance: 0,
        total_earned: 0,
        total_spent: 0,
      });
    } else {
      wallet = wallets[0];
    }

    const newBalance = (wallet.balance || 0) + tokens;

    // Update wallet balance
    await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
      balance: newBalance,
      total_earned: (wallet.total_earned || 0) + tokens,
    });

    // Record transaction
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: userId,
      wallet_type: 'user',
      type: 'topup',
      amount: tokens,
      balance_after: newBalance,
      reference_id: sessionId,
      description: `Acquisto ${tokens} token`,
      idempotency_key: sessionId,
    });

    // Update payment_orders if order_id is present
    if (orderId) {
      try {
        const orders = await base44.asServiceRole.entities.PaymentOrder?.filter?.({ id: orderId });
        if (orders && orders.length > 0 && orders[0].status === 'pending') {
          await base44.asServiceRole.entities.PaymentOrder.update(orders[0].id, {
            status: 'succeeded',
            provider_reference: sessionId,
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (orderErr) {
        console.warn('Could not update payment_order:', orderErr.message);
      }
    }

    // Log financial event
    try {
      await base44.asServiceRole.entities.FinancialLog?.create?.({
        action: 'token_topup',
        actor_id: userId,
        amount_tokens: tokens,
        details: { session_id: sessionId, order_id: orderId, pack_code: meta.pack_code },
      });
    } catch (_) { /* ignore if entity doesn't exist */ }

    console.log(`Credited ${tokens} tokens to user ${userId} (session: ${sessionId})`);
    return Response.json({ received: true });
  } catch (error) {
    console.error('tokenWebhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
