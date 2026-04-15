import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, RefreshCw, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFeedEngine } from "../hooks/useFeedEngine";
import FeedTabs from "../components/feed/FeedTabs";
import SegmentBadge from "../components/feed/SegmentBadge";
import CreatorFeedCard from "../components/feed/CreatorFeedCard";
import { useAuth } from "@/lib/AuthContext";

const PREVIEW_LIMIT = 4;

export default function Feed() {
  const {
    tab, setTab,
    loading,
    userProfile, userSegment,
    currentFeed, feeds,
    trackView, trackLeave, trackClick,
    refresh,
  } = useFeedEngine();

  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [search, setSearch] = useState("");
  const isLoggedIn = isLoadingAuth ? null : isAuthenticated;

  const allDisplayed = (currentFeed || []).filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.creator_name?.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const isLimited = isLoggedIn === false;
  const displayed = isLimited ? allDisplayed.slice(0, PREVIEW_LIMIT) : allDisplayed;
  const showLoginWall = isLimited && allDisplayed.length > PREVIEW_LIMIT;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-strong border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {/* Search + segment */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca creator o tag..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/30 h-10"
              />
            </div>
            {userProfile && <SegmentBadge segment={userSegment} />}
            <Button variant="ghost" size="icon" onClick={refresh} className="shrink-0 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Feed tabs */}
          <FeedTabs activeTab={tab} setTab={setTab} livCount={feeds.live?.length || 0} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab description */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          {{
            foryou:       <p className="text-sm text-muted-foreground">Il tuo feed personalizzato — ottimizzato per massimizzare la tua esperienza</p>,
            highspenders: <p className="text-sm text-muted-foreground">Creator con il più alto tasso di conversione e spesa media</p>,
            discovery:    <p className="text-sm text-muted-foreground">Nuovi creator e contenuti fuori dalla tua bolla</p>,
            live:         <p className="text-sm text-muted-foreground">Dirette attive in questo momento</p>,
          }[tab]}
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Calcolando il tuo feed personalizzato...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-3xl mb-3">
              {tab === "live" ? "📡" : tab === "discovery" ? "🔭" : "✨"}
            </p>
            <p className="font-heading font-bold mb-1">
              {tab === "live" ? "Nessuna live attiva" : "Nessun risultato"}
            </p>
            <p className="text-sm text-muted-foreground">
              {tab === "live" ? "Torna più tardi per vedere i creator in diretta." : "Prova a cercare con parole diverse."}
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((creator, i) => (
                <CreatorFeedCard
                  key={creator.id || creator.creator_id}
                  creator={creator}
                  index={i}
                  onView={trackView}
                  onLeave={trackLeave}
                  onClickCreator={trackClick}
                />
              ))}
            </div>

            {/* Login wall */}
            <AnimatePresence>
              {showLoginWall && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-0 relative"
                >
                  {/* Fade overlay on last row */}
                  <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
                  
                  <div className="flex flex-col items-center gap-6 py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl font-bold mb-2">Scopri tutti i creator</h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                        Accedi gratuitamente per vedere tutti i creator e personalizzare il tuo feed.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 glow-primary font-semibold px-8"
                        onClick={() => navigate('/fan-login')}
                      >
                        Accedi ora
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-border/50 font-medium px-8"
                        onClick={() => navigate('/fan-login?mode=register')}
                      >
                        Registrati gratis
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}