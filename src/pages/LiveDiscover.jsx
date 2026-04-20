import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, TrendingUp, Loader2 } from "lucide-react";
import LiveCard from "../components/live/LiveCard";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function LiveDiscover() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return; }
    supabase
      .from("live_sessions")
      .select("*, profiles:creator_id(id, full_name, avatar_url, handle)")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setStreams(data || []);
        setLoading(false);
      });
  }, []);

  const trending = [...streams].sort((a, b) => (b.viewer_count + b.total_donations) - (a.viewer_count + a.total_donations)).slice(0, 2);

  return (
    <div className="min-h-screen">
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
                  {streams.length} LIVE ORA
                </div>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold">Live Streaming</h1>
              <p className="text-sm text-muted-foreground mt-1">Guarda i creator in diretta e supportali</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Caricamento live...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-24">
            <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold mb-2">Nessuna live attiva</h2>
            <p className="text-sm text-muted-foreground">Torna più tardi per vedere i creator in diretta.</p>
          </div>
        ) : (
          <>
            {trending.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="font-heading font-bold">Trending ora</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 mb-10">
                  {trending.map((stream, i) => (
                    <LiveCard key={stream.id} stream={stream} index={i} />
                  ))}
                </div>
              </>
            )}

            {streams.length > 2 && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Radio className="w-5 h-5 text-destructive animate-pulse" />
                  <h2 className="font-heading font-bold">Tutte le live</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {streams.map((stream, i) => (
                    <LiveCard key={stream.id} stream={stream} index={i} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
