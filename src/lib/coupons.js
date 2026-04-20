import { supabase, hasSupabase } from "./supabase";

export async function validateCoupon(code) {
  if (!hasSupabase || !code) return { valid: false, error: "Codice non valido" };

  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return { valid: false, error: "Coupon non trovato" };

  if (data.max_uses && data.used_count >= data.max_uses) {
    return { valid: false, error: "Coupon esaurito" };
  }
  if (data.valid_until && new Date(data.valid_until) < new Date()) {
    return { valid: false, error: "Coupon scaduto" };
  }
  if (data.valid_from && new Date(data.valid_from) > new Date()) {
    return { valid: false, error: "Coupon non ancora attivo" };
  }

  return {
    valid: true,
    coupon: {
      id: data.id,
      code: data.code,
      discountPercent: data.discount_percent,
      discountTokens: data.discount_tokens,
      creatorId: data.creator_id,
    },
  };
}

export function applyDiscount(tokens, coupon) {
  if (!coupon) return tokens;
  let discounted = tokens;
  if (coupon.discountPercent > 0) {
    discounted = Math.round(tokens * (1 - coupon.discountPercent / 100));
  }
  if (coupon.discountTokens > 0) {
    discounted = Math.max(0, discounted - coupon.discountTokens);
  }
  return discounted;
}

export async function markCouponUsed(couponId) {
  if (!hasSupabase || !couponId) return;
  await supabase.rpc("increment_coupon_usage", { coupon_id: couponId }).catch((e) => {
    console.warn("[coupons] increment failed:", e.message);
  });
}
