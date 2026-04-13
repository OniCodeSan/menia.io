import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Rate limit store (in-memory, per instance)
const rateLimitStore = new Map();
const RATE_LIMIT_TOKENS = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const CREATOR_SHARE = 0.85;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, description, reference_id, creator_id, creator_email, idempotency_key } = await req.json();

    if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

    // Rate limiting
    const now = Date.now();
    const rl = rateLimitStore.get(user.id) || { tokens: 0, window_start: now };
    if (now - rl.window_start > RATE_LIMIT_WINDOW_MS) {
      rl.tokens = 0;
      rl.window_start = now;
    }
    if (rl.tokens + amount > RATE_LIMIT_TOKENS) {
      return Response.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // Idempotency check
    if (idempotency_key) {
      const existing = await base44.asServiceRole.entities.TokenTransaction.filter({ idempotency_key });
      if (existing && existing.length > 0) {
        return Response.json({ success: true, idempotent: true });
      }
    }

    // Get user wallet
    const wallets = await base44.asServiceRole.entities.TokenWallet.filter({
      user_id: user.id, wallet_type: 'user',
    });

    if (!wallets || wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = wallets[0];
    if ((wallet.balance || 0) < amount) {
      return Response.json({ error: 'Saldo insufficiente' }, { status: 400 });
    }

    const newBalance = wallet.balance - amount;

    // Update user wallet
    await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
      balance: newBalance,
      total_spent: (wallet.total_spent || 0) + amount,
    });

    // Record user spend transaction
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: user.id,
      user_email: user.email,
      wallet_type: 'user',
      type: 'spend',
      amount: -amount,
      balance_after: newBalance,
      reference_id: reference_id || null,
      description: description || 'Spesa token',
      idempotency_key: idempotency_key || null,
    });

    // Credit creator (85%)
    if (creator_id) {
      const creatorTokens = Math.floor(amount * CREATOR_SHARE);

      const creatorWallets = await base44.asServiceRole.entities.TokenWallet.filter({
        user_id: creator_id, wallet_type: 'creator',
      });

      let creatorWallet;
      if (!creatorWallets || creatorWallets.length === 0) {
        creatorWallet = await base44.asServiceRole.entities.TokenWallet.create({
          user_id: creator_id,
          user_email: creator_email || '',
          wallet_type: 'creator',
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          total_paid_out: 0,
        });
      } else {
        creatorWallet = creatorWallets[0];
      }

      const creatorNewBalance = (creatorWallet.balance || 0) + creatorTokens;
      await base44.asServiceRole.entities.TokenWallet.update(creatorWallet.id, {
        balance: creatorNewBalance,
        total_earned: (creatorWallet.total_earned || 0) + creatorTokens,
      });

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: creator_id,
        user_email: creator_email || '',
        wallet_type: 'creator',
        type: 'earn',
        amount: creatorTokens,
        balance_after: creatorNewBalance,
        reference_id: reference_id || null,
        description: `${description || 'Guadagno'} (85%)`,
      });
    }

    // Update rate limit
    rl.tokens += amount;
    rateLimitStore.set(user.id, rl);

    console.log(`Spent ${amount} tokens for user ${user.id}, new balance: ${newBalance}`);
    return Response.json({ success: true, new_balance: newBalance });
  } catch (error) {
    console.error('tokenSpend error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});