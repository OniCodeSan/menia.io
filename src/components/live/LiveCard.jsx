import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Zap, Radio } from "lucide-react";

export default function LiveCard({ stream, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link to="/live" className="group block">
        <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all duration-300">
          <div className="relative aspect-video overflow-hidden">
            <img
              src={stream.thumbnail}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />

            {/* LIVE badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </div>

            {/* Viewers */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs font-medium">
              <Users className="w-3 h-3" />
              {stream.viewers}
            </div>

            {/* Donations */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-chart-4/20 border border-chart-4/30 text-xs font-semibold text-chart-4">
              <Zap className="w-3 h-3" />
              €{stream.donations}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <img src={stream.creatorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <p className="text-sm font-semibold">{stream.creatorName}</p>
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