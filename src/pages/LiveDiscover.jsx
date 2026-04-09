import { motion } from "framer-motion";
import { Radio, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveCard from "../components/live/LiveCard";
import { Link } from "react-router-dom";

const LIVE_STREAMS = [
  {
    id: 1,
    title: "🔥 Live Workout: Full Body HIIT — Alleniamoci insieme!",
    thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=340&fit=crop",
    creatorName: "Sara Rossi",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    category: "Fitness",
    viewers: "1.2K",
    donations: 340,
  },
  {
    id: 2,
    title: "Q&A Photography — Rispondo alle vostre domande",
    thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=340&fit=crop",
    creatorName: "Marco Bianchi",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    category: "Fotografia",
    viewers: "487",
    donations: 120,
  },
  {
    id: 3,
    title: "Session musicale live — Compongo con voi 🎵",
    thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=340&fit=crop",
    creatorName: "Elena Conti",
    creatorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
    category: "Musica",
    viewers: "2.1K",
    donations: 680,
  },
  {
    id: 4,
    title: "Gaming Night — Torneo con i fan!",
    thumbnail: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=340&fit=crop",
    creatorName: "Luca Ferrari",
    creatorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face",
    category: "Gaming",
    viewers: "934",
    donations: 210,
  },
];

export default function LiveDiscover() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-xs font-bold text-destructive">
                  <Radio className="w-3 h-3 animate-pulse" />
                  {LIVE_STREAMS.length} LIVE ORA
                </div>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold">Live Streaming</h1>
              <p className="text-sm text-muted-foreground mt-1">Guarda i creator in diretta e supportali</p>
            </div>
            <Link to="/go-live">
              <Button className="bg-destructive hover:bg-destructive/90 font-semibold">
                <Radio className="w-4 h-4 mr-2" />
                Vai in diretta
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold">Trending ora</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-10">
          {LIVE_STREAMS.slice(0, 2).map((stream, i) => (
            <LiveCard key={stream.id} stream={stream} index={i} />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Radio className="w-5 h-5 text-destructive animate-pulse" />
          <h2 className="font-heading font-bold">Tutti i live</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {LIVE_STREAMS.map((stream, i) => (
            <LiveCard key={stream.id + "-all"} stream={stream} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}