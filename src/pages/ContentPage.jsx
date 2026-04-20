import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Heart, MessageCircle, Share2, Bookmark, ArrowLeft, Crown, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useParams, useLocation } from "react-router-dom";
import { supabase, hasSupabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage";
import { interactionsService } from "@/lib/interactions";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import SEO from "@/components/shared/SEO";

export default function ContentPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const tP = t.contentPage;
  const { user } = useAuth();
  const location = useLocation();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (id && hasSupabase) {
        const { data: post } = await supabase
          .from("posts")
          .select("id, creator_id, title, description, media_url, media_path, access, price, type, created_at, likes_count, comments_count")
          .eq("id", id)
          .maybeSingle();

        if (!cancelled && post) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, handle, avatar_url, bio")
            .eq("id", post.creator_id)
            .maybeSingle();

          const creator = profile ? {
            id: profile.id,
            handle: profile.handle,
            name: profile.full_name || "Creator",
            avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || "C")}&background=7c3aed&color=fff&size=200`,
            fans: 0,
            fansLabel: "0",
            subscriptionTokenMonthly: 100,
            isReal: true,
          } : null;

          if (creator) {
            let imageUrl = post.media_url || "/tokaro-logo.png";
            if (post.media_path) {
              const signed = await storageService.getSignedUrl(post.media_path);
              if (signed) imageUrl = signed;
            }
            const content = {
              id: post.id,
              title: post.title,
              image: imageUrl,
              mediaType: post.type,
              type: post.access === "public" ? "free" : "premium",
              unlockPriceTokens: post.price || 0,
              body: post.description || "",
              likes: String(post.likes_count || 0),
              comments: post.comments_count || 0,
              timeAgo: timeAgo(post.created_at),
            };

            let access = post.access === "public";
            if (!access && user) {
              if (user.id === post.creator_id) {
                access = true;
              } else {
                const [{ data: sub }, { data: unlock }] = await Promise.all([
                  supabase
                    .from("subscriptions")
                    .select("id, tier")
                    .eq("fan_id", user.id)
                    .eq("creator_id", post.creator_id)
                    .eq("status", "active")
                    .maybeSingle(),
                  supabase
                    .from("content_unlocks")
                    .select("id")
                    .eq("fan_id", user.id)
                    .eq("post_id", post.id)
                    .maybeSingle(),
                ]);
                if (unlock) access = true;
                if (sub) {
                  if (post.access === "subscribers") access = true;
                  if (post.access === "premium" && sub.tier === "premium") access = true;
                }
              }
            }

            if (!cancelled) {
              setRecord({ ...content, creator });
              setHasAccess(access);
              setLoading(false);
              return;
            }
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 mx-auto mb-4 flex items-center justify-center">
            <Lock className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">{tP.notFound}</h1>
          <p className="text-sm text-muted-foreground mb-6">{tP.notFoundDesc}</p>
          <Link to="/feed">
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tP.backToFeed}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { creator, ...content } = record;
  const isLocked = content.type === "premium" && !hasAccess;
  const otherContents = [];

  const likeCount = (() => {
    const base = parseFloat(String(content.likes || "0").replace("K", "")) || 0;
    const isK = String(content.likes || "").includes("K");
    const n = isK ? base * 1000 : base;
    return liked ? n + 1 : n;
  })();

  const formatLikes = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  const checkoutHref = creator.isReal
    ? `/checkout?creator=${creator.handle}&content=${content.id}&mode=unlock&creator_id=${creator.id}`
    : `/checkout?creator=${creator.handle}&content=${content.id}&mode=unlock`;
  const subscribeHref = creator.isReal
    ? `/checkout?creator=${creator.handle}&mode=subscribe&creator_id=${creator.id}`
    : `/checkout?creator=${creator.handle}&mode=subscribe`;

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/content/${content.id}` : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: content.title, url });
        setShareStatus(tP.shared);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus(tP.linkCopied);
      } else {
        setShareStatus("Link: " + url);
      }
    } catch {
      setShareStatus(tP.shareCancelled);
    }
    setTimeout(() => setShareStatus(""), 2500);
  };

  useEffect(() => {
    if (!showComments || !id || commentsLoaded) return;
    interactionsService.listComments(id).then(setComments).catch((err) => console.warn("[ContentPage] comments:", err.message));
    setCommentsLoaded(true);
  }, [showComments, id, commentsLoaded]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const c = await interactionsService.addComment(id, draft);
      setComments((prev) => [...prev, c]);
      setDraft("");
    } catch (err) { console.warn("[ContentPage] addComment:", err.message); }
    setSendingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await interactionsService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) { console.warn("[ContentPage] deleteComment:", err.message); }
  };

  return (
    <div className="min-h-screen">
      {record && (
        <SEO
          title={record.title}
          description={record.body ? record.body.slice(0, 160) : `Contenuto di ${record.creator?.name || "un creator"} su Tokaro.fans`}
          image={record.type === "free" ? record.image : undefined}
          url={`/content/${id}`}
          type="article"
        />
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {tP.backToFeed}
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden border border-border/30"
            >
              <div className="relative bg-black flex items-center justify-center min-h-[300px]">
                {content.mediaType === "video" && !isLocked ? (
                  <video
                    src={content.image}
                    className="w-full max-h-[70vh] object-contain"
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    playsInline
                  />
                ) : (
                  <img
                    src={content.image}
                    alt={content.title}
                    className={`w-full max-h-[70vh] object-contain ${isLocked ? "blur-xl scale-105" : ""}`}
                  />
                )}

                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                    <div className="glass-strong rounded-2xl border border-border/50 p-8 text-center max-w-sm mx-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-primary">
                        <Lock className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-heading text-xl font-bold mb-2">{tP.premiumTitle}</h3>
                      <p className="text-sm text-muted-foreground mb-6">{tP.premiumDesc}</p>
                      <div className="space-y-3">
                        <Link to={checkoutHref} className="block">
                          <Button className="w-full bg-primary hover:bg-primary/90 glow-primary font-semibold h-11">
                            <Crown className="w-4 h-4 mr-2" />
                            {tP.unlockBtn} — {content.unlockPriceTokens} T
                          </Button>
                        </Link>
                        <Link to={subscribeHref} className="block">
                          <Button variant="outline" className="w-full border-border/50 h-11">
                            {tP.subscribeShort} — {creator.subscriptionTokenMonthly} {tP.perMonth}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4">
                  <Badge
                    className={
                      content.type === "premium"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                    }
                  >
                    {content.type === "premium" ? tP.premium : tP.free}
                  </Badge>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <h1 className="font-heading text-xl sm:text-2xl font-bold mb-3">{content.title}</h1>

              <div className="flex items-center gap-4 mb-4">
                <Link to={`/creator/${creator.handle}`} className="flex items-center gap-3 group">
                  <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{creator.name}</p>
                    <p className="text-xs text-muted-foreground">{content.timeAgo}</p>
                  </div>
                </Link>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{content.body}</p>

              <div className="flex items-center gap-2 border-t border-border/30 pt-4">
                <Button variant="ghost" size="sm" onClick={() => setLiked(!liked)} className={liked ? "text-destructive" : "text-muted-foreground"}>
                  <Heart className={`w-4 h-4 mr-1.5 ${liked ? "fill-current" : ""}`} />
                  {formatLikes(likeCount)}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowComments((v) => !v)} className={showComments ? "text-primary" : "text-muted-foreground"}>
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {commentsLoaded ? comments.length : (content.comments || 0)}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground">
                  <Share2 className="w-4 h-4 mr-1.5" />
                  {shareStatus || tP.share}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSaved(!saved)} className={`ml-auto ${saved ? "text-primary" : "text-muted-foreground"}`}>
                  <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                </Button>
              </div>

              {showComments && (
                <div className="mt-5 bg-card/50 border border-border/30 rounded-2xl p-4 space-y-4">
                  {user ? (
                    <form onSubmit={handlePostComment} className="flex gap-2">
                      <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tP.writeComment} className="bg-secondary/30 border-border/30 h-10" maxLength={2000} />
                      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={!draft.trim() || sendingComment}>
                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </form>
                  ) : (
                    <Link to="/fan-login" state={{ from: location.pathname }} className="block text-sm text-center text-muted-foreground py-2 hover:text-primary">
                      {tP.loginToComment}
                    </Link>
                  )}
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">{tP.noComments}</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2 text-xs group">
                          {c.user?.avatar_url ? (
                            <img src={c.user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-[10px]">
                              {(c.user?.full_name || "U")[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">{c.user?.full_name || "Utente"} <span className="text-muted-foreground font-normal ml-2">{timeAgo(c.created_at)}</span></p>
                            <p className="text-muted-foreground mt-0.5">{c.body}</p>
                          </div>
                          {user && c.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 border border-border/30 rounded-2xl p-5"
            >
              <Link to={`/creator/${creator.handle}`} className="flex items-center gap-3 mb-4 group">
                <img src={creator.avatar} alt={creator.name} className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">@{creator.handle} · {creator.fansLabel || "0"} {tP.fansSuffix}</p>
                </div>
              </Link>
              <Link to={subscribeHref}>
                <Button className="w-full bg-primary hover:bg-primary/90 glow-primary font-semibold">
                  <Crown className="w-4 h-4 mr-2" />
                  {tP.subscribeShort} — {creator.subscriptionTokenMonthly} {tP.perMonth}
                </Button>
              </Link>
            </motion.div>

            {otherContents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card/50 border border-border/30 rounded-2xl p-5"
              >
                <h3 className="font-heading font-bold text-sm mb-4">{tP.moreFrom} {creator.name.split(" ")[0]}</h3>
                <div className="space-y-3">
                  {otherContents.map((item) => (
                    <Link key={item.id} to={`/content/${item.id}`} className="flex items-center gap-3 group">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <img src={item.image} alt={item.title} className={`w-full h-full object-cover ${item.type === "premium" ? "blur-sm" : ""}`} />
                        {item.type === "premium" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                            <Lock className="w-3 h-3 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                        <Badge className={`text-[10px] mt-1 ${item.type === "premium" ? "bg-primary/20 text-primary border-primary/30" : "bg-chart-3/20 text-chart-3 border-chart-3/30"}`}>
                          {item.type === "premium" ? tP.premium : tP.free}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}
