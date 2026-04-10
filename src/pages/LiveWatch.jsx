import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Radio, Crown, Share2, Heart, ArrowLeft, Play, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import LiveChat from "../components/live/LiveChat";
import DonationPanel from "../components/live/DonationPanel";
import DonationAlert from "../components/live/DonationAlert";

function VideoPlayer() {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fullscreen = (e) => {
    e.stopPropagation();
    videoRef.current?.requestFullscreen?.();
  };

  return (
    <div className="relative w-full h-full bg-black cursor-pointer" onClick={toggle}>
      {/* Real video — replace src with actual stream/video URL */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        poster="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&h=500&fit=crop"
        muted
        playsInline
        loop
      />
      {/* Play overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
            <Play className="w-7 h-7 text-white fill-white" />
          </div>
        </div>
      )}
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all">
          {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
        <button onClick={fullscreen} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all">
          <Maximize2 className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function LiveWatch() {
  const [viewers] = useState(1247);
  const [totalDonations] = useState(340);
  const [liked, setLiked] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState("chat");

  const handleNewDonation = useCallback((donation) => {
    setCurrentDonation(donation);
    setTimeout(() => setCurrentDonation(null), 4000);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Back */}
        <Link to="/live-discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Torna ai live
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main stream area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video player */}
            <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-black aspect-video group">
              {/* Real video element — swap src for a real HLS/MP4 URL */}
              <VideoPlayer />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Donation alert */}
              <DonationAlert donation={currentDonation} />

              {/* Top bar */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                    <Radio className="w-3 h-3 animate-pulse" />
                    LIVE
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-medium">
                    <Users className="w-3 h-3" />
                    {viewers.toLocaleString()} spettatori
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-chart-4">
                    <Zap className="w-3 h-3" />
                    €{totalDonations} donati
                  </div>
                </div>
              </div>

              {/* Bottom creator info */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                  alt="Creator"
                  className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                />
                <div>
                  <p className="text-white font-semibold text-sm">Sara Rossi</p>
                  <p className="text-white/70 text-xs">Fitness & Lifestyle</p>
                </div>
              </div>
            </div>

            {/* Stream info */}
            <div className="bg-card/50 border border-border/30 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="font-heading font-bold text-base sm:text-lg mb-1">
                    🔥 Live Workout: Full Body HIIT — Alleniamoci insieme!
                  </h1>
                  <p className="text-sm text-muted-foreground">Fitness · Iniziato 32 minuti fa</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLiked(!liked)}
                    className={liked ? "text-destructive" : "text-muted-foreground"}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${liked ? "fill-current" : ""}`} />
                    4.2K
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Share2 className="w-4 h-4 mr-1" />
                    Condividi
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile: panel tabs */}
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
                  <LiveChat onNewDonation={handleNewDonation} />
                ) : (
                  <DonationPanel creatorName="Sara Rossi" isSubscribed={false} />
                )}
              </div>
            </div>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Chat */}
            <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden flex flex-col" style={{ height: "480px" }}>
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <span className="font-heading font-bold text-sm">Chat live</span>
                <span className="ml-auto text-xs text-muted-foreground">{viewers.toLocaleString()} online</span>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <LiveChat onNewDonation={handleNewDonation} />
              </div>
            </div>

            {/* Donation / Sub panel */}
            <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <span className="font-heading font-bold text-sm">Supporta il creator</span>
              </div>
              <DonationPanel creatorName="Sara Rossi" isSubscribed={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}