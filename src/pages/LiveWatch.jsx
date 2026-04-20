import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Radio, Share2, Heart, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import LiveChat from "../components/live/LiveChat";
import DonationPanel from "../components/live/DonationPanel";
import DonationAlert from "../components/live/DonationAlert";
import ReportButton from "../components/moderation/ReportButton";
import { supabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function LiveWatch() {
  const { user } = useAuth();
  const { id: liveId } = useParams();
  const [session, setSession] = useState(null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState("chat");

  useEffect(() => {
    if (!hasSupabase || !liveId) { setLoading(false); return; }
    supabase
      .from("live_sessions")
      .select("*, profiles:creator_id(id, full_name, avatar_url, handle)")
      .eq("id", liveId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSession(data);
          setCreator(data.profiles);
        }
        setLoading(false);
      });
  }, [liveId]);

  const handleNewDonation = useCallback((donation) => {
    setCurrentDonation(donation);
    setTimeout(() => setCurrentDonation(null), 4000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Radio className="w-12 h-12 text-muted-foreground" />
        <h2 className="font-heading text-xl font-bold">Live non trovata</h2>
        <p className="text-sm text-muted-foreground">Questa live potrebbe essere terminata o non esistere.</p>
        <Link to="/live-discover">
          <Button variant="outline">Scopri altre live</Button>
        </Link>
      </div>
    );
  }

  const isEnded = session.status === "ended";
  const creatorName = creator?.full_name || "Creator";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/live-discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Torna ai live
        </Link>

        {isEnded && (
          <div className="mb-4 bg-secondary/60 border border-border/30 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Questa live è terminata</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-black aspect-video group">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Radio className={`w-12 h-12 mx-auto mb-2 ${isEnded ? "text-muted-foreground" : "text-destructive animate-pulse"}`} />
                  <p className="text-sm text-white/70">{isEnded ? "Live terminata" : "Live in corso"}</p>
                </div>
              </div>

              <DonationAlert donation={currentDonation} />

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isEnded && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                      <Radio className="w-3 h-3 animate-pulse" />
                      LIVE
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-medium">
                    <Users className="w-3 h-3" />
                    {session.viewer_count} spettatori
                  </div>
                </div>
                {session.total_donations > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-chart-4">
                    <Zap className="w-3 h-3" />
                    {session.total_donations} Token donati
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-primary bg-secondary flex items-center justify-center overflow-hidden">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{creatorName[0]}</span>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{creatorName}</p>
                  <p className="text-white/70 text-xs">{session.category}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="font-heading font-bold text-base sm:text-lg mb-1">{session.title}</h1>
                  <p className="text-sm text-muted-foreground">{session.category} · {session.sub_only ? "Solo abbonati" : "Aperta a tutti"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLiked(!liked)}
                    className={liked ? "text-destructive" : "text-muted-foreground"}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${liked ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => navigator.share?.({ title: session.title, url: window.location.href }).catch(() => {})}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Condividi
                  </Button>
                  {creator && (
                    <ReportButton
                      targetId={creator.id}
                      targetRole="creator"
                      targetName={creatorName}
                      contextType="live"
                      contextId={liveId}
                      variant="ghost"
                      label="Segnala"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Mobile panels */}
            <div className="lg:hidden">
              <div className="flex gap-1 mb-3 bg-secondary/40 p-1 rounded-xl">
                {[{ id: "chat", label: "Chat" }, { id: "donate", label: "Supporta" }].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setShowSidePanel(tab.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      showSidePanel === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden h-96">
                {showSidePanel === "chat" ? (
                  <LiveChat liveId={liveId} onNewDonation={handleNewDonation} />
                ) : (
                  <DonationPanel
                    liveId={liveId}
                    creatorId={session.creator_id}
                    creatorName={creatorName}
                    isSubscribed={false}
                    onDonated={handleNewDonation}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden flex flex-col" style={{ height: "480px" }}>
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <span className="font-heading font-bold text-sm">Chat live</span>
                <span className="ml-auto text-xs text-muted-foreground">{session.viewer_count} online</span>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <LiveChat liveId={liveId} onNewDonation={handleNewDonation} />
              </div>
            </div>

            {session.donations_enabled && !isEnded && (
              <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30">
                  <span className="font-heading font-bold text-sm">Supporta il creator</span>
                </div>
                <DonationPanel
                  liveId={liveId}
                  creatorId={session.creator_id}
                  creatorName={creatorName}
                  isSubscribed={false}
                  onDonated={handleNewDonation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
