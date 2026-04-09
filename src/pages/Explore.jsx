import { motion } from "framer-motion";
import { Search, Crown, Star, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const topCreators = [
  {
    name: "Sara Rossi", handle: "@sararossi", category: "Fitness",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
    fans: "12.4K", posts: 234,
  },
  {
    name: "Marco Bianchi", handle: "@marcob", category: "Fotografia",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    fans: "8.2K", posts: 156,
  },
  {
    name: "Elena Conti", handle: "@elenaconti", category: "Musica",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
    fans: "15.1K", posts: 312,
  },
  {
    name: "Luca Ferrari", handle: "@lucaf", category: "Gaming",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&crop=face",
    fans: "6.7K", posts: 89,
  },
  {
    name: "Giulia Moretti", handle: "@giuliam", category: "Arte",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    fans: "9.8K", posts: 201,
  },
  {
    name: "Andrea Ricci", handle: "@andrear", category: "Tech",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face",
    fans: "11.3K", posts: 178,
  },
];

export default function Explore() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">Esplora Creator</h1>
            <p className="text-muted-foreground text-sm mb-6">Scopri i migliori creator sulla piattaforma</p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca creator per nome o categoria..."
                className="pl-10 bg-secondary/50 border-border/30 h-11"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Trending section */}
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Top Creator</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topCreators.map((creator, i) => (
            <motion.div
              key={creator.handle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to="/creator" className="group block">
                <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 bg-card/50 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={creator.image}
                      alt={creator.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  </div>
                  <div className="p-5 -mt-10 relative">
                    <div className="flex items-end gap-3 mb-3">
                      <img
                        src={creator.image}
                        alt={creator.name}
                        className="w-14 h-14 rounded-xl border-2 border-card object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-heading font-bold">{creator.name}</h3>
                        <p className="text-xs text-muted-foreground">{creator.handle}</p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
                        <Crown className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-primary">{creator.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{creator.fans} fan</span>
                      <span>{creator.posts} contenuti</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}