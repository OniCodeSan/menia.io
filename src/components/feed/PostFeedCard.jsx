import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Video, ImageIcon, Lock, Globe, Users, Heart, MessageCircle, Share2 } from "lucide-react";
import InlineComments from "./InlineComments";
import ShareMenu from "./ShareMenu";

const TYPE_ICON = { post: FileText, video: Video, photo: ImageIcon };
const ACCESS_META = {
  public: { icon: Globe, label: "Pubblico" },
  subscribers: { icon: Users, label: "Abbonati" },
  premium: { icon: Lock, label: "Premium" },
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|$)/i;
const detectMedia = (url, type) => {
  if (!url) return null;
  if (IMAGE_EXT.test(url)) return "image";
  if (VIDEO_EXT.test(url)) return "video";
  if (type === "photo") return "image";
  if (type === "video") return "video";
  return null;
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

export default function PostFeedCard({ post, index = 0, liked, likesCount, commentsCount, onToggleLike, onCommentCountChange }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const creator = post.creator || {};
  const handle = creator.handle || creator.id?.slice(0, 8);
  const profileHref = `/creator/${creator.handle || creator.id}`;
  const mediaKind = detectMedia(post.media_url, post.type);
  const accessMeta = ACCESS_META[post.access] || ACCESS_META.public;
  const AccessIcon = accessMeta.icon;
  const TypeIcon = TYPE_ICON[post.type] || FileText;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-border/50 transition-colors"
    >
      {/* Creator header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link to={profileHref}>
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(creator.full_name || "C")[0].toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={profileHref} className="font-semibold text-sm hover:underline truncate block">
            {creator.full_name || "Creator"}
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {handle && <span>@{handle}</span>}
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/50 border border-border/30 text-muted-foreground">
          <AccessIcon className="w-3 h-3" />
          {accessMeta.label}
        </span>
      </div>

      {/* Title + description */}
      <div className="px-4 pb-2">
        <h3 className="font-heading font-bold text-[15px] leading-snug">{post.title}</h3>
        {post.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{post.description}</p>
        )}
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="relative">
          {mediaKind === "image" ? (
            <img src={post.media_url} alt={post.title} className="w-full max-h-[500px] object-cover" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
          ) : mediaKind === "video" ? (
            videoError ? (
              <div className="h-48 bg-secondary/20 flex items-center justify-center text-xs text-muted-foreground">Video non disponibile</div>
            ) : (
              <video src={post.media_url} className="w-full max-h-[500px] object-contain bg-black" controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} playsInline onError={() => setVideoError(true)} />
            )
          ) : (
            <div className="h-48 bg-secondary/20 flex items-center justify-center">
              <TypeIcon className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/20">
        <div className="flex items-center gap-5">
          <button
            onClick={() => onToggleLike?.(post.id)}
            className="flex items-center gap-1.5 transition-colors text-sm"
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
            {(likesCount || 0) > 0 && <span className={`text-xs font-semibold ${liked ? "text-destructive" : "text-muted-foreground"}`}>{likesCount}</span>}
          </button>
          <button
            onClick={() => setCommentsOpen(v => !v)}
            className={`flex items-center gap-1.5 transition-colors text-sm ${commentsOpen ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <MessageCircle className="w-5 h-5" />
            {(commentsCount || 0) > 0 && <span className="text-xs font-semibold">{commentsCount}</span>}
          </button>
          <div className="relative">
            <button
              onClick={() => setShareOpen(v => !v)}
              className={`flex items-center gap-1.5 transition-colors text-sm ${shareOpen ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Share2 className="w-5 h-5" />
            </button>
            <ShareMenu post={post} open={shareOpen} onClose={() => setShareOpen(false)} />
          </div>
        </div>
        {post.price && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30">
            {Number(post.price)} T
          </span>
        )}
      </div>

      {/* Inline comments accordion */}
      <AnimatePresence>
        {commentsOpen && (
          <InlineComments
            postId={post.id}
            onCountChange={(delta) => onCommentCountChange?.(post.id, delta)}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}
