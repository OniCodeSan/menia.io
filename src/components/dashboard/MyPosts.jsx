import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Video, ImageIcon, Lock, Globe, Users, Trash2, Loader2, AlertCircle, Inbox } from "lucide-react";
import { postsService } from "@/lib/posts";
import { storageService } from "@/lib/storage";

const TYPE_META = {
  post: { icon: FileText, label: "Post", color: "text-accent bg-accent/10 border-accent/30" },
  video: { icon: Video, label: "Video", color: "text-primary bg-primary/10 border-primary/30" },
  photo: { icon: ImageIcon, label: "Foto", color: "text-chart-3 bg-chart-3/10 border-chart-3/30" },
};

const ACCESS_META = {
  public: { icon: Globe, label: "Pubblico" },
  subscribers: { icon: Users, label: "Abbonati" },
  premium: { icon: Lock, label: "Premium" },
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|$)/i;
const detectMedia = (url, fallbackType) => {
  if (!url) return null;
  if (IMAGE_EXT.test(url)) return "image";
  if (VIDEO_EXT.test(url)) return "video";
  if (fallbackType === "photo") return "image";
  if (fallbackType === "video") return "video";
  return null;
};

export default function MyPosts({ refreshKey = 0 }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await postsService.listMine();
      setPosts(rows);
    } catch (err) {
      if (err?.message?.includes("request stole it")) {
        console.warn("[MyPosts] lock contention (harmless), retrying");
        try {
          const rows = await postsService.listMine();
          setPosts(rows);
        } catch (retryErr) {
          setError(retryErr.message || "Errore nel caricamento");
        }
      } else {
        setError(err.message || "Errore nel caricamento");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleDelete = async (post) => {
    if (!confirm(`Eliminare "${post.title}"?`)) return;
    setDeletingId(post.id);
    try {
      await postsService.remove(post.id);
      if (post.media_path) await storageService.remove(post.media_path).catch(() => {});
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      setError(err.message || "Errore durante l'eliminazione");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Caricamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-primary/60" />
        </div>
        <h2 className="font-heading font-bold text-lg mb-2">Nessun contenuto ancora</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          I post che pubblichi appariranno qui. Vai su <span className="text-primary font-semibold">Pubblica</span> per
          caricare il tuo primo contenuto.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">I miei contenuti</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{posts.length} {posts.length === 1 ? "post pubblicato" : "post pubblicati"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const typeMeta = TYPE_META[post.type] || TYPE_META.post;
          const accessMeta = ACCESS_META[post.access] || ACCESS_META.public;
          const TypeIcon = typeMeta.icon;
          const AccessIcon = accessMeta.icon;
          const mediaKind = detectMedia(post.media_url, post.type);
          const isImage = mediaKind === "image";
          const isVideo = mediaKind === "video";
          return (
            <div
              key={post.id}
              className="group relative bg-card/50 border border-border/30 rounded-2xl overflow-hidden hover:border-border/60 transition-colors"
            >
              {post.media_url ? (
                <div className="aspect-video bg-secondary/30 overflow-hidden">
                  {isImage ? (
                    <img src={post.media_url} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : isVideo ? (
                    <video src={post.media_url} className="w-full h-full object-cover bg-black" muted playsInline preload="auto" controlsList="nodownload" onLoadedData={(e) => { e.target.currentTime = 0.5; }} onContextMenu={(e) => e.preventDefault()} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-secondary/20 flex items-center justify-center">
                  <TypeIcon className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{post.title}</h3>
                  <button
                    onClick={() => handleDelete(post)}
                    disabled={deletingId === post.id}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                    aria-label="Elimina"
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {post.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.description}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeMeta.color}`}>
                    <TypeIcon className="w-3 h-3" />
                    {typeMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/50 border border-border/40 text-muted-foreground">
                    <AccessIcon className="w-3 h-3" />
                    {accessMeta.label}
                  </span>
                  {post.price && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30">
                      {Number(post.price)} T
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/70">{formatDate(post.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
