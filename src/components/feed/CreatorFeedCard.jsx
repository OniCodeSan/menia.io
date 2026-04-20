import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Radio, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { nameToHandle } from "@/lib/mockData";

const FALLBACK_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face",
];
const FALLBACK_COVERS = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=340&fit=crop",
];

function seededIndex(str, arr) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % arr.length;
  return hash;
}

export default function CreatorFeedCard({ creator, index = 0, onView, onLeave, onClickCreator }) {
  const ref = useRef(null);
  const entered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !entered.current) {
          entered.current = true;
          onView(creator.creator_id);
        } else if (!entry.isIntersecting && entered.current) {
          entered.current = false;
          onLeave?.(creator.creator_id, Math.round(entry.intersectionRatio * 100));
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [creator.creator_id, onView, onLeave]);

  const avatar = creator.avatar_url || FALLBACK_AVATARS[seededIndex(creator.creator_id, FALLBACK_AVATARS)];
  const cover  = creator.cover_url || FALLBACK_COVERS[seededIndex(creator.creator_id + "c", FALLBACK_COVERS)];
  const score  = creator._score != null ? Math.round(creator._score * 100) : null;
  const profileSlug = creator.creator_handle || nameToHandle(creator.creator_name) || creator.creator_id;
  const profileHref = `/creator/${profileSlug}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/40 transition-all group"
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden">
        <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {creator.is_live && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
            </span>
          )}
          {creator.is_new_creator && (
            <span className="px-2 py-0.5 rounded-full bg-chart-3/90 text-black text-[10px] font-bold">NEW</span>
          )}
          {creator.boost_active && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-chart-4/90 text-black text-[10px] font-bold">
              <Zap className="w-2.5 h-2.5" /> BOOST
            </span>
          )}
        </div>

        {/* Score pill */}
        {score != null && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-chart-4">
            ⚡ {score}
          </div>
        )}

        {/* Live viewers */}
        {creator.is_live && (
          <div className="absolute bottom-3 right-3 text-[10px] font-semibold text-white/80">
            👁 {(creator.live_viewers || 0).toLocaleString()}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary/30" />
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-sm truncate">{creator.creator_name || "Creator"}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(creator.tags || []).slice(0, 2).map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/20 pt-3">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-chart-3" />
            {Math.round((creator.global_conversion_rate || 0) * 100)}% conv.
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-chart-4" />
            {creator.global_avg_spend || 0} T avg
          </span>
          <Link
            to={profileHref}
            onClick={() => onClickCreator?.(creator.creator_id)}
            className="text-primary font-semibold hover:underline"
          >
            Vedi →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}