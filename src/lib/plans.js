export const PLAN_FEATURES = {
  free: {
    label: "Free",
    price_eur: 0,
    publish_free_content: true,
    publish_premium_content: false,
    receive_tokens: false,
    paid_dm: false,
    go_live: false,
    analytics: "none",
  },
  start: {
    label: "Start",
    price_eur: 24.90,
    publish_free_content: true,
    publish_premium_content: true,
    receive_tokens: true,
    paid_dm: true,
    go_live: false,
    analytics: "basic",
  },
  pro: {
    label: "Pro",
    price_eur: 49.90,
    publish_free_content: true,
    publish_premium_content: true,
    receive_tokens: true,
    paid_dm: true,
    go_live: true,
    analytics: "advanced",
  },
};

export const TOKEN_PACKS = [
  { eur: 10, tokens: 80 },
  { eur: 15, tokens: 120 },
  { eur: 20, tokens: 160 },
  { eur: 25, tokens: 200 },
  { eur: 50, tokens: 420 },
  { eur: 100, tokens: 850 },
];

export const PAYOUT_RATE = 0.10;

export const DM_COST = 1;

export function canCreatorUse(feature, plan, role) {
  if (role === "admin") return feature === "analytics" ? "advanced" : true;
  const p = PLAN_FEATURES[plan];
  if (!p) return false;
  if (feature === "analytics") return p.analytics;
  return !!p[feature];
}
