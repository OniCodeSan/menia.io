import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function FeaturedCreators() {
  const { t } = useLanguage();
  const f = t.featured;
  const [creators, setCreators] = useState([]);

  useEffect(() => {
    if (!hasSupabase) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, handle, avatar_url, bio, role")
        .eq("role", "creator")
        .limit(4);
      if (data) {
        setCreators(data.map((p) => ({
          handle: p.handle || p.id.slice(0, 8),
          name: p.full_name || "Creator",
          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "C")}&background=7c3aed&color=fff`,
          category: "",
          fansLabel: "0",
          rating: 0,
        })));
      }
    })();
  }, []);

  if (creators.length === 0) return null;

  const CreatorCard = ({ creator, i }) => (
    <motion.div
      key={creator.handle}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.1 }}
      className="snap-start shrink-0 w-[72vw] sm:w-auto"
    >
      <Link to={`/creator/${creator.handle}`} className="group block">
        <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/40 transition-all duration-300">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-full h-64 sm:h-72 object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full glass text-xs font-medium">
            <Crown className="w-3 h-3 text-primary" />
            <span>{f.topCreator}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-heading font-bold text-base">{creator.name}</h3>
            {creator.category && <p className="text-xs text-muted-foreground mb-2">{creator.category}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">@{creator.handle}</span>
              {creator.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-chart-4 fill-chart-4" />
                  <span className="text-xs font-medium">{Number(creator.rating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <section className="py-12 sm:py-24 px-4 sm:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">{f.label}</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            {f.title1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{f.title2}</span>
          </h2>
        </motion.div>

        {creators.length === 1 ? (
          <div className="max-w-sm mx-auto">
            <CreatorCard creator={creators[0]} i={0} />
          </div>
        ) : (
          <>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 sm:hidden -mx-4 px-4">
              {creators.map((creator, i) => (
                <CreatorCard key={creator.handle} creator={creator} i={i} />
              ))}
            </div>
            <div className={`hidden sm:grid gap-6 ${creators.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : creators.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              {creators.map((creator, i) => (
                <CreatorCard key={creator.handle} creator={creator} i={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
