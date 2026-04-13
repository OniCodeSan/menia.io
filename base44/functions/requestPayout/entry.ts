import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAYOUT_RATE = 0.075; // 1 token = 0.075 EUR
const MIN_PAYOUT_EUR = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { token_amount } = await req.json();
    if (!token_amount || token_amount <= 0) {
      return Response.json({ error: 'Importo non valido' }, { status: 400 });
    }

    const euroAmount = parseFloat((token_amount * PAYOUT_RATE).toFixed(2));
    if (euroAmount < MIN_PAYOUT_EUR) {
      return Response.json({
        error: `Minimo payout: €${MIN_PAYOUT_EUR}. Con ${token_amount} token ottieni €${euroAmount}.`
      }, { status: 400 });
    }

    // Get creator wallet
    const wallets = await base44.asServiceRole.entities.TokenWallet.filter({
      user_id: user.id, wallet_type: 'creator',
    });
    if (!wallets || wallets.length === 0) {
      return Response.json({ error: 'Wallet creator non trovato' }, { status: 404 });
    }

    const wallet = wallets[0];
    if ((wallet.balance || 0) < token_amount) {
      return Response.json({ error: 'Saldo insufficiente' }, { status: 400 });
    }

    // Deduct tokens from creator wallet
    const newBalance = wallet.balance - token_amount;
    await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
      balance: newBalance,
      total_paid_out: (wallet.total_paid_out || 0) + token_amount,
    });

    // Record payout transaction
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: user.id,
      user_email: user.email,
      wallet_type: 'creator',
      type: 'payout',
      amount: -token_amount,
      balance_after: newBalance,
      description: `Payout richiesto: €${euroAmount}`,
    });

    // Create payout request
    const payout = await base44.asServiceRole.entities.PayoutRequest.create({
      creator_id: user.id,
      creator_email: user.email,
      token_amount,
      euro_amount: euroAmount,
      status: 'pending',
    });

    console.log(`Payout request created for ${user.id}: ${token_amount} tokens = €${euroAmount}`);
    return Response.json({ success: true, payout_id: payout.id, euro_amount: euroAmount });
  } catch (error) {
    console.error('requestPayout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});