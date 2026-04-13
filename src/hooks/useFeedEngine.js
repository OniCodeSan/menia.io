import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  buildForYouFeed,
  buildHighSpendersFeed,
  buildDiscoveryFeed,
  buildLiveFeed,
  computeScore,
  segmentUser,
} from "@/lib/feedScoring";

/**
 * Hook principale del feed engine.
 * Carica creator scores, profilo utente e comportamenti,
 * costruisce i 4 layer del feed e traccia il comportamento.
 */
export function useFeedEngine() {
  const [tab, setTab] = useState("foryou");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userSegment, setUserSegment] = useState("lurker");
  const [feeds, setFeeds] = useState({ foryou: [], highspenders: [], discovery: [], live: [] });
  const viewTimers = useRef({});

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);

      // Carica creator scores
      const creators = await base44.entities.CreatorScore.list("-global_conversion_rate", 100);

      let profile = { declared_interests: [], implicit_interests: [], segment: "lurker", total_spent_tokens: 0 };
      let behaviors = [];

      if (user) {
        // Profilo utente
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles?.[0]) {
          profile = profiles[0];
        } else {
          // Crea profilo vuoto
          profile = await base44.entities.UserProfile.create({ user_id: user.id, user_email: user.email });
        }

        // Comportamenti ultimi 30 giorni
        behaviors = await base44.entities.ContentBehavior.filter({ user_id: user.id });

        // Aggiorna segmento
        const seg = segmentUser(behaviors, profile.total_spent_tokens || 0);
        if (seg !== profile.segment) {
          await base44.entities.UserProfile.update(profile.id, { segment: seg });
          profile = { ...profile, segment: seg };
        }
        setUserSegment(seg);
      }

      setUserProfile(profile);

      setFeeds({
        foryou: buildForYouFeed(creators, profile, behaviors),
        highspenders: buildHighSpendersFeed(creators, profile, behaviors),
        discovery: buildDiscoveryFeed(creators, profile, behaviors),
        live: buildLiveFeed(creators),
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Traccia visualizzazione — chiama questo quando un card entra in viewport
   */
  const trackView = useCallback((creatorId) => {
    viewTimers.current[creatorId] = Date.now();
  }, []);

  /**
   * Traccia fine visualizzazione — chiama quando esce dal viewport
   */
  const trackLeave = useCallback(async (creatorId, scrollDepth = 0) => {
    const start = viewTimers.current[creatorId];
    if (!start) return;
    const seconds = Math.round((Date.now() - start) / 1000);
    delete viewTimers.current[creatorId];
    if (seconds < 1) return;

    const user = await base44.auth.me().catch(() => null);
    if (!user) return;

    const existing = await base44.entities.ContentBehavior.filter({
      user_id: user.id,
      creator_id: creatorId,
    });

    if (existing?.[0]) {
      await base44.entities.ContentBehavior.update(existing[0].id, {
        view_time_seconds: (existing[0].view_time_seconds || 0) + seconds,
        scroll_depth: Math.max(existing[0].scroll_depth || 0, scrollDepth),
        return_visits: (existing[0].return_visits || 0) + 1,
      });
    } else {
      await base44.entities.ContentBehavior.create({
        user_id: user.id,
        creator_id: creatorId,
        view_time_seconds: seconds,
        scroll_depth: scrollDepth,
        return_visits: 1,
        session_date: new Date().toISOString(),
      });
    }
  }, []);

  /**
   * Traccia click su profilo
   */
  const trackClick = useCallback(async (creatorId) => {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return;
    const existing = await base44.entities.ContentBehavior.filter({ user_id: user.id, creator_id: creatorId });
    if (existing?.[0]) {
      await base44.entities.ContentBehavior.update(existing[0].id, {
        profile_clicks: (existing[0].profile_clicks || 0) + 1,
      });
    }
  }, []);

  const currentFeed = feeds[tab] || [];

  return {
    tab, setTab,
    loading,
    userProfile, userSegment,
    currentFeed, feeds,
    trackView, trackLeave, trackClick,
    refresh: loadFeed,
  };
}