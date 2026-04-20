import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronUp } from "lucide-react";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import CommentsSheet from "./CommentsSheet";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|$)/i;
const isVideoUrl = (url, type) => {
  if (!url) return false;
  if (VIDEO_EXT.test(url)) return true;
  return type === "video";
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}g`;
  return `${Math.floor(days / 30)}mo`;
};

function VideoSlide({ post, isActive, isMuted, onToggleMute, liked, likesCount, commentsCount, onToggleLike, onShare, onOpenComments }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const creator = post.creator || {};
  const profileHref = `/creator/${creator.handle || creator.id}`;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.currentTime = 0;
      vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  return (
    <div className="relative w-full h-full snap-start snap-always bg-black flex items-center justify-center">
      {videoError ? (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">Video non disponibile</p>
          <button onClick={() => { setVideoError(false); videoRef.current?.load(); }} className="text-xs text-primary hover:underline">Riprova</button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={post.media_url}
          className="w-full h-full object-contain"
          loop
          playsInline
          muted={isMuted}
          preload={isActive ? "auto" : "metadata"}
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
          onError={() => setVideoError(true)}
        />
      )}

      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
            <Play className={`w-8 h-8 text-white ${isPlaying ? "opacity-0" : ""}`} fill="white" />
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Creator info + caption (bottom-left) */}
      <div className="absolute bottom-4 left-4 right-16 z-10">
        <Link to={profileHref} className="flex items-center gap-2 mb-3">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {(creator.full_name || "C")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm drop-shadow-lg">
              {creator.full_name || "Creator"}
            </p>
            {creator.handle && (
              <p className="text-white/70 text-xs drop-shadow">@{creator.handle}</p>
            )}
          </div>
        </Link>

        <h3 className="text-white font-semibold text-[15px] leading-snug drop-shadow-lg mb-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-white/80 text-xs line-clamp-2 drop-shadow">{post.description}</p>
        )}
        <p className="text-white/50 text-[10px] mt-1">{timeAgo(post.created_at)}</p>
      </div>

      {/* Action buttons (right side) */}
      <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-5">
        <button onClick={() => onToggleLike?.(post.id)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Heart className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : "text-white"}`} />
          </div>
          {(likesCount || 0) > 0 && <span className="text-white text-[10px] font-bold">{likesCount}</span>}
        </button>
        <button onClick={() => onOpenComments?.(post.id)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          {(commentsCount || 0) > 0 && <span className="text-white text-[10px] font-bold">{commentsCount}</span>}
        </button>
        <button onClick={() => onShare?.(post)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
        </button>
        <button onClick={onToggleMute} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </div>
        </button>
      </div>
    </div>
  );
}

export default function VideoFeed({ posts, loading }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState(null);

  const videoPosts = (posts || []).filter(p => isVideoUrl(p.media_url, p.type));
  const { likedSet, counts, toggleLike, updateCommentCount, share } = usePostInteractions(videoPosts);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const slideH = el.clientHeight;
    const idx = Math.round(el.scrollTop / slideH);
    setActiveIndex(idx);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-30">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (videoPosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-30 px-6 text-center">
        <ChevronUp className="w-10 h-10 text-white/30 mb-4" />
        <p className="text-white font-heading font-bold text-lg mb-2">Nessun video ancora</p>
        <p className="text-white/50 text-sm">I creator non hanno ancora pubblicato video. Torna presto!</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-30 overflow-y-scroll snap-y snap-mandatory bg-black"
        style={{ scrollBehavior: "smooth" }}
      >
        {videoPosts.map((post, i) => (
          <div key={post.id} className="w-full" style={{ height: "100dvh" }}>
            <VideoSlide
              post={post}
              isActive={i === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(m => !m)}
              liked={likedSet.has(post.id)}
              likesCount={counts[post.id]?.likes || 0}
              commentsCount={counts[post.id]?.comments || 0}
              onToggleLike={toggleLike}
              onShare={share}
              onOpenComments={setCommentsPostId}
            />
          </div>
        ))}
      </div>

      <CommentsSheet
        postId={commentsPostId}
        open={!!commentsPostId}
        onClose={() => setCommentsPostId(null)}
        onCountChange={(delta) => commentsPostId && updateCommentCount(commentsPostId, delta)}
      />
    </>
  );
}
