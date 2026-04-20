import { useState, useEffect, useCallback } from "react";
import { interactionsService } from "@/lib/interactions";

export function usePostInteractions(posts) {
  const [likedSet, setLikedSet] = useState(new Set());
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!posts?.length) return;
    const ids = posts.map(p => p.id);
    const initial = {};
    posts.forEach(p => {
      initial[p.id] = { likes: p.likes_count || 0, comments: p.comments_count || 0 };
    });
    setCounts(prev => ({ ...prev, ...initial }));

    interactionsService.getLikeStatus(ids).then(setLikedSet).catch(() => {});
  }, [posts]);

  const toggleLike = useCallback(async (postId) => {
    try {
      const { liked } = await interactionsService.toggleLike(postId);
      setLikedSet(prev => {
        const next = new Set(prev);
        liked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setCounts(prev => ({
        ...prev,
        [postId]: { ...prev[postId], likes: (prev[postId]?.likes || 0) + (liked ? 1 : -1) },
      }));
    } catch {}
  }, []);

  const updateCommentCount = useCallback((postId, delta) => {
    setCounts(prev => ({
      ...prev,
      [postId]: { ...prev[postId], comments: Math.max(0, (prev[postId]?.comments || 0) + delta) },
    }));
  }, []);

  const share = useCallback(async (post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    const title = post.title || "Post su Tokaro";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return { likedSet, counts, toggleLike, updateCommentCount, share };
}
