import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Flame, Star, X, SlidersHorizontal, Users, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ALL_CREATORS = [
  {
    name: "Sara Rossi", handle: "@sararossi", category: "Fitness",
    bio: "Personal trainer certificata. Allenamenti HIIT, yoga e nutrizione sportiva.",
    tags: ["hiit", "yoga", "dieta", "workout", "benessere"],
    fans: 12400, posts: 234, rating: 4.9, isLive: true, trending: true,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
    price: "€9.99",
  },
  {
    name: "Marco Bianchi", handle: "@marcob", category: "Fotografia",
    bio: "Fotografo professionista. Tutorial, lightroom, street e paesaggio.",
    tags: ["fotografia", "lightroom", "tutorial", "paesaggio", "ritratto"],
    fans: 8200, posts: 156, rating: 4.7, isLive: false, trending: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    price: "€6.99",
  },
  {
    name: "Elena Conti", handle: "@elenaconti", category: "Musica",
    bio: "Cantante e chitarrista. Lezioni online, cover e composizione originale.",
    tags: ["musica", "chitarra", "canto", "lezioni", "composizione"],
    fans: 15100, posts: 312, rating: 5.0, isLive: true, trending: true,
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
    price: "€12.99",
  },
  {
    name: "Luca Ferrari", handle: "@lucaf", category: "Gaming",
    bio: "Pro gamer e streamer. Guide, speedrun, tornei e community gaming.",
    tags: ["gaming", "fps", "rpg", "streaming", "esports"],
    fans: 6700, posts: 89, rating: 4.5, isLive: false, trending: false,
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&crop=face",
    price: "€4.99",
  },
  {
    name: "Giulia Moretti", handle: "@giuliam", category: "Arte",
    bio: "Illustratrice digitale e pittrice. Procreate, acquerello e concept art.",
    tags: ["arte", "illustrazione", "procreate", "acquerello", "design"],
    fans: 9800, posts: 201, rating: 4.8, isLive: false, trending: true,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    price: "€7.99",
  },
  {
    name: "Andrea Ricci", handle: "@andrear", category: "Tech",
    bio: "Sviluppatore full-stack. Coding, startup, AI e produttività digitale.",
    tags: ["coding", "ai", "startup", "javascript", "produttività"],
    fans: 11300, posts: 178, rating: 4.6, isLive: false, trending: false,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face",
    price: "€9.99",
  },
  {
    name: "Chiara Neri", handle: "@chiaraneri", category: "Cucina",
    bio: "Chef casalinga. Ricette veloci, sani e sfiziosi. Cucina italiana autentica.",
    tags: ["cucina", "ricette", "italiana", "dolci", "vegano"],
    fans: 7400, posts: 145, rating: 4.7, isLive: false, trending: false,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face",
    price: "€5.99",
  },
  {
    name: "Roberto Esposito", handle: "@roberto.v", category: "Viaggi",
    bio: "Viaggiatore seriale. Guida ai luoghi nascosti d'Europa e consigli per budget travel.",
    tags: ["viaggi", "europa", "budget", "avventura", "fotografia"],
    fans: 13600, posts: 267, rating: 4.9, isLive: true, trending: true,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face",
    price: "€8.99",
  },
];

const CATEGORIES = ["Tutti", "Fitness", "Fotografia", "Musica", "Gaming", "Arte", "Tech", "Cucina", "Viaggi"];
const SORT_OPTIONS = [
  { id: "trending", label: "Trending" },
  { id: "fans", label: "Più seguiti" },
  { id: "rating", label: "Valutazione" },
  { id: "posts", label: "Contenuti" },
];
const POPULAR_TAGS = ["hiit", "yoga", "tutorial", "musica", "coding", "ai", "ricette", "viaggi", "arte", "gaming"];

function highlight(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
      : part
  );
}

export default function Explore() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tutti");
  const [sort, setSort] = useState("trending");
  const [activeTags, setActiveTags] = useState([]);
  const [onlyLive, setOnlyLive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const toggleTag = (tag) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const results = useMemo(() => {
    let list = [...ALL_CREATORS];

    // Keyword search — name, handle, bio, tags, category
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.bio.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.tags.some(t => t.includes(q))
      );
      // Boost exact name/handle matches to top
      list.sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(q) || a.handle.toLowerCase().includes(q);
        const bExact = b.name.toLowerCase().startsWith(q) || b.handle.toLowerCase().includes(q);
        return (bExact ? 1 : 0) - (aExact ? 1 : 0);
      });
    }

    // Category filter
    if (category !== "Tutti") list = list.filter(c => c.category === category);

    // Tag filter
    if (activeTags.length > 0) list = list.filter(c => activeTags.every(t => c.tags.includes(t)));

    // Live filter
    if (onlyLive) list = list.filter(c => c.isLive);

    // Sort (only if no keyword — keyword already sets relevance order)
    if (!query.trim()) {
      if (sort === "trending") list = list.filter(c => c.trending).concat(list.filter(c => !c.trending));
      else if (sort === "fans") list.sort((a, b) => b.fans - a.fans);
      else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
      else if (sort === "posts") list.sort((a, b) => b.posts - a.posts);
    }

    return list;
  }, [query, category, sort, activeTags, onlyLive]);

  const hasActiveFilters = category !== "Tutti" || activeTags.length > 0 || onlyLive;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-1">Esplora Creator</h1>
            <p className="text-muted-foreground text-sm mb-5">Cerca per nome, categoria, bio o tag</p>

            {/* Search bar */}
            <div className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Es. yoga, chitarra, AI, Marco..."
                  className="pl-10 bg-secondary/50 border-border/30 h-11"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(v => !v)}
                className={`h-11 px-4 border-border/30 gap-2 ${hasActiveFilters ? "border-primary/50 text-primary" : ""}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtri {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-5">
                {/* Categories */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Categoria</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          category === cat
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tag popolari</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          activeTags.includes(tag)
                            ? "bg-accent/20 text-accent border-accent/40"
                            : "bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort + Live */}
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ordina per</p>
                    <div className="flex gap-2">
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSort(opt.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            sort === opt.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Solo live</p>
                    <button
                      onClick={() => setOnlyLive(v => !v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        onlyLive
                          ? "bg-destructive/20 text-destructive border-destructive/40"
                          : "bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${onlyLive ? "bg-destructive animate-pulse" : "bg-muted-foreground"}`} />
                      Live ora
                    </button>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={() => { setCategory("Tutti"); setActiveTags([]); setOnlyLive(false); }}
                      className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 mt-5"
                    >
                      <X className="w-3 h-3" /> Azzera filtri
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active tags chips */}
        {activeTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold border border-accent/30">
                #{tag}
                <button onClick={() => toggleTag(tag)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {query ? (
              <>
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.length}</span> risultati per "{query}"
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">
                  {category === "Tutti" ? "Tutti i Creator" : category}
                </h2>
                <span className="text-xs text-muted-foreground">({results.length})</span>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        {results.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nessun creator trovato</p>
            <p className="text-xs mt-1">Prova con parole chiave diverse o azzera i filtri</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {results.map((creator, i) => (
              <motion.div
                key={creator.handle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to="/creator" className="group block">
                  <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/40 bg-card/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={creator.image}
                        alt={creator.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                      {creator.isLive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </div>
                      )}
                      {creator.trending && !creator.isLive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-chart-4/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Flame className="w-2.5 h-2.5" />
                          Trending
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs font-bold px-2 py-0.5 rounded-full">
                        {creator.price}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 -mt-8 relative">
                      <div className="flex items-end gap-3 mb-3">
                        <img
                          src={creator.image}
                          alt={creator.name}
                          className="w-12 h-12 rounded-xl border-2 border-card object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-sm truncate">
                            {highlight(creator.name, query)}
                          </h3>
                          <p className="text-[11px] text-muted-foreground">{creator.handle}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                        {highlight(creator.bio, query)}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {creator.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                              activeTags.includes(tag)
                                ? "bg-accent/20 text-accent border-accent/30"
                                : "bg-secondary/50 text-muted-foreground border-border/20"
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/20 pt-3">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {(creator.fans / 1000).toFixed(1)}K
                          </span>
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            {creator.posts}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-chart-4">
                          <Star className="w-3 h-3 fill-chart-4" />
                          <span className="text-[11px] font-bold">{creator.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}