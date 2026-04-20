import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Users, Grid3X3, Crown, Lock, MessageCircle, Heart, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import DonationModal from "../components/payments/DonationModal";
import SubscriptionModal from "../components/payments/SubscriptionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from "react-router-dom";
import { supabase, hasSupabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage";

import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import SEO from "@/components/shared/SEO";

export default function CreatorProfile() {
  const { handle } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const tCP = t.creatorProfile;

  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonation, setShowDonation] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [activeSub, setActiveSub] = useState(null);

  useEffect(() => {
    if (!handle) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      // Try real DB first
      if (hasSupabase) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, handle, avatar_url, bio, role")
          .eq("handle", handle)
          .eq("role", "creator")
          .maybeSingle();

        if (!cancelled && profile) {
          const avatarUrl = profile.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || "C")}&background=7c3aed&color=fff&size=400`;

          setCreator({
            id: profile.id,
            handle: profile.handle,
            name: profile.full_name || "Creator",
            bio: profile.bio || "",
            avatar: avatarUrl,
            cover: avatarUrl,
            fans: 0,
            fansLabel: "0",
            posts: 0,
            rating: 0,
            subscriptionTokenMonthly: 100,
            subscriptionTokenYearly: 840,
            isReal: true,
            contents: [],
          });

          // Load real posts
          const { data: realPosts } = await supabase
            .from("posts")
            .select("id, title, description, media_url, media_path, access, price, type, created_at, likes_count, comments_count")
            .eq("creator_id", profile.id)
            .order("created_at", { ascending: false });

          if (!cancelled && realPosts) {
            const mediaPaths = realPosts.filter((p) => p.media_path).map((p) => p.media_path);
            const signedMap = mediaPaths.length > 0 ? await storageService.getSignedUrls(mediaPaths) : {};

            const mapped = realPosts.map((p) => {
              const mediaUrl = (p.media_path && signedMap[p.media_path]) || p.media_url || "/tokaro-logo.png";
              const isVideo = p.type === "video" || /\.(mp4|webm|mov|avi)(\?|$)/i.test(mediaUrl) || /\.(mp4|webm|mov|avi)(\?|$)/i.test(p.media_path || "");
              return {
                id: p.id,
                title: p.title,
                image: mediaUrl,
                mediaType: isVideo ? "video" : "image",
                type: p.access === "public" ? "free" : "premium",
                unlockPriceTokens: p.price || 0,
                body: p.description || "",
                likes: String(p.likes_count || 0),
                comments: p.comments_count || 0,
                timeAgo: timeAgo(p.created_at),
              };
            });
            setPosts(mapped);
            setCreator((prev) => prev ? { ...prev, posts: mapped.length, contents: mapped } : prev);
          }
          if (user && !cancelled) {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("id, tier, status")
              .eq("fan_id", user.id)
              .eq("creator_id", profile.id)
              .eq("status", "active")
              .maybeSingle();
            if (!cancelled) setActiveSub(sub);
          }

          setLoading(false);
          return;
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 mx-auto mb-4 flex items-center justify-center">
            <Users className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">{tCP.notFound}</h1>
          <p className="text-sm text-muted-foreground mb-6">{tCP.notFoundMsg}</p>
          <Link to="/explore">
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tCP.backToExplore}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${creator.name} (@${creator.handle})`}
        description={creator.bio || `Segui ${creator.name} su Tokaro.fans — contenuti esclusivi, abbonamenti e community.`}
        image={creator.avatar}
        url={`/creator/${creator.handle}`}
        type="profile"
      />
      {/* Cover */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={creator.cover}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Profile header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-6"
        >
          <div className="relative">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-background"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold">{creator.name}</h1>
                <p className="text-muted-foreground text-sm">@{creator.handle}</p>
              </div>
              {creator.rating > 0 && (
                <div className="flex items-center gap-1 sm:ml-auto">
                  <Star className="w-4 h-4 text-chart-4 fill-chart-4" />
                  <span className="text-sm font-semibold">{creator.rating}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-4">{creator.bio}</p>

            <div className="flex items-center gap-6 mb-5">
              <div className="text-center">
                <p className="font-heading font-bold text-lg">{creator.fansLabel || creator.fans}</p>
                <p className="text-xs text-muted-foreground">{tCP.fans}</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-bold text-lg">{creator.posts}</p>
                <p className="text-xs text-muted-foreground">{tCP.posts}</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <p className="font-heading font-bold text-primary">{creator.subscriptionTokenMonthly} {tCP.perMonth}</p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {activeSub ? (
                <Button
                  variant="outline"
                  className="border-chart-3/40 text-chart-3 hover:bg-chart-3/10 font-semibold"
                  disabled
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Abbonato ({activeSub.tier === "premium" ? "Pro" : "Base"})
                </Button>
              ) : (
                <Button
                  onClick={() => setShowSubscription(true)}
                  className="bg-primary hover:bg-primary/90 glow-primary font-semibold"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {tCP.subscribe}
                </Button>
              )}
              <Link to="/messages" state={{
                openConversation: creator.isReal ? {
                  id: creator.id,
                  name: creator.name,
                  avatar: creator.avatar,
                  role: "creator",
                } : undefined
              }}>
                <Button variant="outline" className="border-border/50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {tCP.message}
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowDonation(true)}
                className="border-chart-5/40 text-chart-5 hover:bg-chart-5/10"
              >
                <Heart className="w-4 h-4 mr-2" />
                {tCP.donate}
              </Button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showDonation && <DonationModal creatorId={creator.id} creatorName={creator.name} onClose={() => setShowDonation(false)} />}
          {showSubscription && (
            <SubscriptionModal
              creatorId={creator.isReal ? creator.id : null}
              creatorName={creator.name}
              creatorHandle={creator.handle}
              monthlyTokens={creator.subscriptionTokenMonthly}
              yearlyTokens={creator.subscriptionTokenYearly}
              onClose={(result) => {
                setShowSubscription(false);
                if (result?.subscribed) {
                  setActiveSub({ tier: result.tier, status: "active" });
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs defaultValue="all" className="mt-10">
          <TabsList className="bg-secondary/50 border border-border/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid3X3 className="w-4 h-4 mr-2" />
              {tCP.tabAll}
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Crown className="w-4 h-4 mr-2" />
              {tCP.tabPremium}
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              {tCP.tabCommunity}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <ContentGrid contents={creator.contents || posts} emptyMsg={tCP.noContent} />
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            <ContentGrid contents={(creator.contents || posts).filter(c => c.type === "premium")} emptyMsg={tCP.noContent} />
          </TabsContent>

          <TabsContent value="community" className="mt-6">
            <div className="glass rounded-2xl border border-border/30 p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">{tCP.communityTitle}</h3>
              <p className="text-sm text-muted-foreground mb-4">{tCP.communityDesc} {creator.name}</p>
              <Button onClick={() => setShowSubscription(true)} className="bg-primary hover:bg-primary/90 glow-primary">
                {tCP.communityCta}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-20" />
    </div>
  );
}

function ContentGrid({ contents, emptyMsg }) {
  if (!contents?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {emptyMsg}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {contents.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link to={`/content/${item.id}`} className="group block">
            <div className="relative aspect-square rounded-xl overflow-hidden border border-border/30">
              {item.mediaType === "video" ? (
                <video
                  src={item.image}
                  muted
                  preload="auto"
                  playsInline
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    item.type === "premium" ? "blur-md" : ""
                  }`}
                  onLoadedData={(e) => { e.target.currentTime = 0.5; }}
                />
              ) : (
                <img
                  src={item.image}
                  alt={item.title}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    item.type === "premium" ? "blur-md" : ""
                  }`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {item.type === "premium" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2">
                <Badge
                  className={`text-[10px] ${
                    item.type === "premium"
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                  }`}
                >
                  {item.type === "premium" ? "Premium" : "Free"}
                </Badge>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium line-clamp-2">{item.title}</p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}
