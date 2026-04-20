import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Zap, Radio } from "lucide-react";

export default function LiveCard({ stream, index = 0 }) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef(null);
  const previewUrl = stream.preview_url;
  const thumbUrl = stream.thumbnail_url || stream.thumbnail;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !previewUrl) return;
    if (hovering) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [hovering, previewUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={`/live/${stream.id}`}
        className="group block"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all duration-300">
          <div className="relative aspect-video overflow-hidden bg-black">
            {/* Thumbnail (static) */}
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={stream.title}
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  hovering && previewUrl ? "opacity-0" : "opacity-100"
                }`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                <Radio className="w-10 h-10 text-destructive/40" />
              </div>
            )}

            {/* Preview video (on hover) */}
            {previewUrl && (
              <video
                ref={videoRef}
                src={previewUrl}
                muted
                loop
                playsInline
                preload="auto"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  hovering ? "opacity-100" : "opacity-0"
                }`}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent pointer-events-none" />

            {/* LIVE badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </div>

            {/* Viewers */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs font-medium">
              <Users className="w-3 h-3" />
              {stream.viewer_count || stream.viewers || 0}
            </div>

            {/* Donations */}
            {(stream.total_donations || 0) > 0 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-chart-4/20 border border-chart-4/30 text-xs font-semibold text-chart-4">
                <Zap className="w-3 h-3" />
                {stream.total_donations} T
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {(stream.creatorAvatar || stream.profiles?.avatar_url) ? (
                  <img src={stream.creatorAvatar || stream.profiles?.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {(stream.creatorName || stream.profiles?.full_name || "C")[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{stream.creatorName || stream.profiles?.full_name || "Creator"}</p>
                <p className="text-xs text-muted-foreground">{stream.category}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/90 line-clamp-2">{stream.title}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
