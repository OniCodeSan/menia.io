import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFeedEngine } from "../hooks/useFeedEngine";
import FeedTabs from "../components/feed/FeedTabs";
import SegmentBadge from "../components/feed/SegmentBadge";
import CreatorFeedCard from "../components/feed/CreatorFeedCard";

export default function Feed() {
  const {
    tab, setTab,
    loading,
    userProfile, userSegment,
    currentFeed, feeds,
    trackView, trackLeave, trackClick,
    refresh,
  } = useFeedEngine();

  const [search, setSearch] = useState("");

  const displayed = (currentFeed || []).filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.creator_name?.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

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
        )}
      </div>
    </div>
  );
}