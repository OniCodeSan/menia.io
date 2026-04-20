import { supabase, hasSupabase } from "./supabase";
import { TOKEN_PACKS, PLAN_FEATURES } from "./plans";

const PACK_BY_CODE = Object.fromEntries(
  TOKEN_PACKS.map((p) => [`pack_${p.tokens}`, p])
);

const PLAN_BY_CODE = Object.fromEntries(
  Object.entries(PLAN_FEATURES)
    .filter(([, v]) => v.price_eur > 0)
    .map(([k, v]) => [k, v])
);

export async function createTokenPurchaseIntent(userId, packCode) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const pack = PACK_BY_CODE[packCode];
  if (!pack) throw new Error(`Pack non valido: ${packCode}`);

  const { data, error } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_type: "token_pack",
      target_code: packCode,
      amount_eur: pack.eur,
      token_amount: pack.tokens,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createPlanPurchaseIntent(userId, planCode) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const plan = PLAN_BY_CODE[planCode];
  if (!plan) throw new Error(`Piano non valido: ${planCode}`);

  const { data, error } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_type: "creator_plan",
      target_code: planCode,
      amount_eur: plan.price_eur,
      token_amount: null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function confirmTokenPurchase(orderId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const { data, error } = await supabase.rpc("confirm_token_purchase", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function confirmPlanPurchase(orderId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const { data, error } = await supabase.rpc("confirm_plan_purchase", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function failPaymentOrder(orderId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const { data, error } = await supabase.rpc("fail_payment_order", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getOrderById(orderId) {
  if (!hasSupabase) return null;
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listUserOrders(userId) {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listPendingOrders() {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*, profiles!payment_orders_user_id_fkey(full_name, email, handle, role)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listAllOrders(limit = 50) {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*, profiles!payment_orders_user_id_fkey(full_name, email, handle, role)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function startCheckout(orderId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Non autenticato");

  const res = await fetch("/api/checkout/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Errore avvio pagamento");
  return json;
}

export { PACK_BY_CODE, PLAN_BY_CODE };
