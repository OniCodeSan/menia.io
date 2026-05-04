import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PACKAGES: Record<string, { tokens: number; price_cents: number; label: string }> = {
  pack_80:  { tokens: 80,  price_cents: 1000,  label: '80 Token' },
  pack_120: { tokens: 120, price_cents: 1500,  label: '120 Token' },
  pack_160: { tokens: 160, price_cents: 2000,  label: '160 Token' },
  pack_200: { tokens: 200, price_cents: 2500,  label: '200 Token' },
  pack_420: { tokens: 420, price_cents: 5000,  label: '420 Token' },
  pack_850: { tokens: 850, price_cents: 10000, label: '850 Token' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pack_code, order_id } = await req.json();
    const pkg = PACKAGES[pack_code];
    if (!pkg) return Response.json({ error: 'Invalid package' }, { status: 400 });

    const appUrl = req.headers.get('origin') || 'https://tokaro.fans';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: pkg.label, description: `${pkg.tokens} token per Tokaro.fans` },
          unit_amount: pkg.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/token-wallet?success=1&order=${order_id || ''}`,
      cancel_url: `${appUrl}/token-wallet?cancelled=1`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        tokens: String(pkg.tokens),
        pack_code,
        order_id: order_id || '',
        event_type: 'token_purchase',
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('tokenCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
