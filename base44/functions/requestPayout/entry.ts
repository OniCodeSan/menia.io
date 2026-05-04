import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Legacy edge function — kept for backwards compatibility but the
// primary payout path is now the DB RPC wallet_request_payout which
// enforces KYC, payout method, holding period, and fraud checks.
// This function simply proxies to the RPC.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { token_amount, notes } = await req.json();
    if (!token_amount || token_amount <= 0) {
      return Response.json({ error: 'Importo non valido' }, { status: 400 });
    }

    // Delegate to the authoritative DB RPC
    const { data, error } = await base44.asServiceRole.supabase
      .rpc('wallet_request_payout', {
        p_token_amount: token_amount,
        p_notes: notes || '',
      });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, payout_id: data?.id, euro_amount: data?.euro_amount });
  } catch (error) {
    console.error('requestPayout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
