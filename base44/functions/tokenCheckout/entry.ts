import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PACKAGES = [
  { tokens: 100, price_cents: 1000, label: '100 Token' },
  { tokens: 250, price_cents: 2400, label: '250 Token' },
  { tokens: 600, price_cents: 5400, label: '600 Token' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { package_index } = await req.json();
    const pkg = PACKAGES[package_index];
    if (!pkg) return Response.json({ error: 'Invalid package' }, { status: 400 });

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: pkg.label, description: `${pkg.tokens} token per la piattaforma` },
          unit_amount: pkg.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/token-wallet?success=1&tokens=${pkg.tokens}`,
      cancel_url: `${appUrl}/token-wallet?cancelled=1`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        user_email: user.email,
        tokens: String(pkg.tokens),
        event_type: 'token_purchase',
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('tokenCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});