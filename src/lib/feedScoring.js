/**
 * Feed Scoring Engine — Unlockr
 * Ottimizza: "quanto spende questo utente nei prossimi 10 minuti"
 */

const WEIGHTS = {
  interest:    0.25,
  behavior:    0.25,
  spend:       0.20,
  novelty:     0.10,
  conversion:  0.10,
  boost:       0.10,
};

/**
 * Calcola il punteggio di interesse basato su tag overlap
 */
function scoreInterest(creator, userProfile) {
  const allInterests = [
    ...(userProfile.declared_interests || []),
    ...(userProfile.implicit_interests || []),
  ];
  if (!allInterests.length || !creator.tags?.length) return 0.3; // neutral
  const matches = creator.tags.filter(t => allInterests.includes(t)).length;
  return Math.min(matches / creator.tags.length, 1);
}

/**
 * Calcola score comportamento utente verso questo creator
 */
function scoreBehavior(creator, behaviors) {
  const b = behaviors.find(bh => bh.creator_id === creator.creator_id);
  if (!b) return 0.1;

  const viewScore = Math.min(b.view_time_seconds / 120, 1); // max 2 min → 1
  const scrollScore = (b.scroll_depth || 0) / 100;
  const returnScore = Math.min((b.return_visits || 0) / 5, 1);
  const clickScore = Math.min((b.profile_clicks || 0) / 3, 1);

  return (viewScore * 0.4 + scrollScore * 0.2 + returnScore * 0.3 + clickScore * 0.1);
}

/**
 * Calcola score spesa utente verso questo creator
 */
function scoreSpend(creator, behaviors, userProfile) {
  const b = behaviors.find(bh => bh.creator_id === creator.creator_id);
  const spent = b?.tokens_spent || 0;
  const totalSpent = userProfile.total_spent_tokens || 1;

  // Proporzione di spesa su questo creator
  const shareScore = Math.min(spent / Math.max(totalSpent, 1), 1);

  // Bonus per whale e spender
  const segmentMultiplier = {
    whale: 1.3,
    spender: 1.1,
    lurker: 0.7,
  }[userProfile.segment] || 1;

  return Math.min(shareScore * segmentMultiplier, 1);
}

/**
 * Score novità contenuto
 */
function scoreNovelty(creator) {
  const freshness = (creator.content_freshness_score || 0) / 100;
  const newBonus = creator.is_new_creator ? 0.4 : 0;
  return Math.min(freshness + newBonus, 1);
}

/**
 * Score conversione globale del creator
 */
function scoreConversion(creator) {
  return Math.min(creator.global_conversion_rate || 0, 1);
}

/**
 * Score boost (pagato o onboarding)
 */
function scoreBoost(creator) {
  if (!creator.boost_active && !creator.onboarding_boost) return 0;
  const multiplier = creator.boost_multiplier || 1;
  const base = creator.onboarding_boost ? 0.5 : 0.7;
  return Math.min(base * multiplier, 1);
}

/**
 * Score finale per un creator dato il profilo utente e i comportamenti
 */
export function computeScore(creator, userProfile, behaviors) {
  const scores = {
    interest:   scoreInterest(creator, userProfile),
    behavior:   scoreBehavior(creator, behaviors),
    spend:      scoreSpend(creator, behaviors, userProfile),
    novelty:    scoreNovelty(creator),
    conversion: scoreConversion(creator),
    boost:      scoreBoost(creator),
  };

  const total = Object.entries(WEIGHTS).reduce((sum, [key, w]) => sum + scores[key] * w, 0);
  return { total: parseFloat(total.toFixed(4)), breakdown: scores };
}

/**
 * Segmenta utente automaticamente dai comportamenti
 */
export function segmentUser(behaviors, totalSpent) {
  if (totalSpent >= 500) return "whale";
  if (totalSpent >= 100 || behaviors.some(b => b.converted)) return "spender";
  return "lurker";
}

/**
 * Costruisce il feed "For You" — mix pesato + anti-bolla
 */
export function buildForYouFeed(creators, userProfile, behaviors) {
  const scored = creators.map(c => ({
    ...c,
    _score: computeScore(c, userProfile, behaviors).total,
  }));

  scored.sort((a, b) => b._score - a._score);

  // Anti-bolla: 20-30% random fuori dalla top
  const top70 = scored.slice(0, Math.ceil(scored.length * 0.75));
  const rest = scored.slice(Math.ceil(scored.length * 0.75));
  const discovery = rest.sort(() => Math.random() - 0.5).slice(0, Math.ceil(scored.length * 0.25));

  return interleave(top70, discovery, 4); // ogni 4 risultati, 1 discovery
}

/**
 * Feed High Spenders — chi converte di più globalmente
 */
export function buildHighSpendersFeed(creators, userProfile, behaviors) {
  return [...creators]
    .filter(c => (c.global_conversion_rate || 0) > 0.1 || (c.global_avg_spend || 0) > 50)
    .sort((a, b) => {
      const sa = computeScore(a, userProfile, behaviors).total * (a.global_avg_spend || 1);
      const sb = computeScore(b, userProfile, behaviors).total * (b.global_avg_spend || 1);
      return sb - sa;
    });
}

/**
 * Feed Discovery — nuovi creator + random
 */
export function buildDiscoveryFeed(creators, userProfile, behaviors) {
  const newCreators = creators.filter(c => c.is_new_creator || c.onboarding_boost);
  const others = creators.filter(c => !c.is_new_creator && !c.onboarding_boost)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  return [...newCreators, ...others];
}

/**
 * Feed Live — ordinato per engagement live
 */
export function buildLiveFeed(creators) {
  return creators
    .filter(c => c.is_live)
    .sort((a, b) => (b.live_viewers || 0) - (a.live_viewers || 0));
}

/**
 * Utility: interleave array A con B ogni N elementi
 */
function interleave(main, extra, every) {
  const result = [];
  let ei = 0;
  main.forEach((item, i) => {
    result.push(item);
    if ((i + 1) % every === 0 && ei < extra.length) {
      result.push(extra[ei++]);
    }
  });
  return result;
}