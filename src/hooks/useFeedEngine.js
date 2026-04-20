import { useState, useEffect, useCallback, useRef } from "react";
import { feedData } from "@/lib/feedData";
import { postsService } from "@/lib/posts";
import {
  buildForYouFeed,
  buildHighSpendersFeed,
  buildDiscoveryFeed,
  buildLiveFeed,
  segmentUser,
} from "@/lib/feedScoring";

export function useFeedEngine() {
  const [tab, setTab] = useState("timeline");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userSegment, setUserSegment] = useState("lurker");
  const [feeds, setFeeds] = useState({ timeline: [], foryou: [], highspenders: [], discovery: [], live: [] });
  const viewTimers = useRef({});
  const cachedUser = useRef(undefined);

  useEffect(() => {
    loadFeed();
  }, []);

  const getUser = async () => {
    if (cachedUser.current !== undefined) return cachedUser.current;
    const { authService } = await import("@/lib/auth");
    const u = await authService.me();
    cachedUser.current = u;
    return u;
  };

  const loadFeed = async () => {
    setLoading(true);
    try {
      const user = await getUser();
      const creators = (await feedData.listCreatorScores(100)) || [];

      let profile = { declared_interests: [], implicit_interests: [], segment: "lurker", total_spent_tokens: 0 };
      let behaviors = [];

      if (user) {
        const remote = await feedData.getUserProfile(user.id, user.email);
        if (remote) profile = { ...profile, ...remote };

        behaviors = await feedData.listBehaviors(user.id);

        const seg = segmentUser(behaviors, profile.total_spent_tokens || 0);
        if (seg !== profile.segment && profile.id) {
          await feedData.updateUserProfile(profile.id, { segment: seg });
          profile = { ...profile, segment: seg };
        }
        setUserSegment(seg);
      }

      const timelinePosts = await postsService.listPublic({ limit: 50 });

      setUserProfile(profile);
      setFeeds({
        timeline: timelinePosts,
        foryou: buildForYouFeed(creators, profile, behaviors),
        highspenders: buildHighSpendersFeed(creators, profile, behaviors),
        discovery: buildDiscoveryFeed(creators, profile, behaviors),
        live: buildLiveFeed(creators),
      });
    } catch (err) {
      console.error("[FeedEngine] loadFeed error:", err);
    } finally {
      setLoading(false);
    }
  };

  const trackView = useCallback((creatorId) => {
    viewTimers.current[creatorId] = Date.now();
  }, []);

  const trackLeave = useCallback(async (creatorId, scrollDepth = 0) => {
    try {
      const start = viewTimers.current[creatorId];
      if (!start) return;
      const seconds = Math.round((Date.now() - start) / 1000);
      delete viewTimers.current[creatorId];
      if (seconds < 2) return;

      const user = await getUser();
      if (!user) return;

      const behaviors = await feedData.listBehaviors(user.id);
      const existing = behaviors.find((b) => b.creator_id === creatorId);
      await feedData.upsertBehavior(user.id, creatorId, {
        view_time_seconds: (existing?.view_time_seconds || 0) + seconds,
        scroll_depth: Math.max(existing?.scroll_depth || 0, scrollDepth),
        return_visits: (existing?.return_visits || 0) + 1,
        session_date: new Date().toISOString(),
      });
    } catch {
      // silently ignore tracking errors
    }
  }, []);

  const trackClick = useCallback(async (creatorId) => {
    try {
      const user = await getUser();
      if (!user) return;
      const behaviors = await feedData.listBehaviors(user.id);
      const existing = behaviors.find((b) => b.creator_id === creatorId);
      await feedData.upsertBehavior(user.id, creatorId, {
        profile_clicks: (existing?.profile_clicks || 0) + 1,
      });
    } catch {
      // silently ignore tracking errors
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
