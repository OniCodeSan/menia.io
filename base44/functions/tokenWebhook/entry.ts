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

  try {
    const base44 = createClientFromRequest(req);

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
        user_email: userEmail,
        wallet_type: 'user',
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        total_paid_out: 0,
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
      user_email: userEmail,
      wallet_type: 'user',
      type: 'topup',
      amount: tokens,
      balance_after: newBalance,
      reference_id: sessionId,
      description: `Acquisto ${tokens} token`,
      idempotency_key: sessionId,
    });

    console.log(`Credited ${tokens} tokens to user ${userId}`);
    return Response.json({ received: true });
  } catch (error) {
    console.error('tokenWebhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});