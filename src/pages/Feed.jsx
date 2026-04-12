import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreatorCard from "../components/shared/CreatorCard";
import { feedContents, categories } from "../lib/mockData";

export default function Feed() {
  const [activeCategory, setActiveCategory] = useState("Tutti");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = feedContents.filter(item => {
    const matchesCategory = activeCategory === "Tutti" || item.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.creatorName.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-strong border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca contenuti o creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/30 h-10"
              />
            </div>
            <Button variant="outline" size="icon" className="border-border/30 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trending banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6"
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Trending</h2>
          <span className="text-sm text-muted-foreground">I contenuti più popolari del momento</span>
        </motion.div>
      </div>

      {/* Content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm font-medium">Nessun contenuto trovato</p>
            <p className="text-xs mt-1">Prova con parole chiave diverse o cambia categoria</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((content, i) => (
              <CreatorCard key={content.id} content={content} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}