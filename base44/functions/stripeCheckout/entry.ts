import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const { type, priceId, amount, creatorName, successUrl, cancelUrl } = await req.json();

    let sessionParams = {
      payment_method_types: ["card"],
      success_url: successUrl || `${req.headers.get("origin")}/checkout?success=true`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/checkout?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        type,
        creatorName: creatorName || "",
      },
    };

    if (type === "subscription") {
      // Abbonamento ricorrente
      sessionParams.mode = "subscription";
      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    } else if (type === "live_access") {
      // Accesso singolo live
      sessionParams.mode = "payment";
      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    } else if (type === "donation") {
      // Donazione importo libero
      sessionParams.mode = "payment";
      sessionParams.line_items = [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Donazione a ${creatorName || "Creator"}`,
            description: "Supporta il tuo creator preferito",
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
    } else {
      return Response.json({ error: "Tipo non valido" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`Checkout session created: ${session.id} | type: ${type}`);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});