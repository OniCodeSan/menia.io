import { motion } from "framer-motion";
import { Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";

const creators = [
  {
    name: "Sara Rossi",
    handle: "@sararossi",
    category: "Fitness & Lifestyle",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
    fans: "12.4K",
    rating: 4.9,
  },
  {
    name: "Marco Bianchi",
    handle: "@marcob",
    category: "Photography",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    fans: "8.2K",
    rating: 4.8,
  },
  {
    name: "Elena Conti",
    handle: "@elenaconti",
    category: "Music & Art",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
    fans: "15.1K",
    rating: 5.0,
  },
  {
    name: "Luca Ferrari",
    handle: "@lucaf",
    category: "Tech & Gaming",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&crop=face",
    fans: "6.7K",
    rating: 4.7,
  },
];

export default function FeaturedCreators() {
  return (
    <section className="py-24 px-4 sm:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">Community</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            Creator in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">evidenza</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {creators.map((creator, i) => (
            <motion.div
              key={creator.handle}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to="/creator" className="group block">
                <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/40 transition-all duration-300">
                  <img
                    src={creator.image}
                    alt={creator.name}
                    className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full glass text-xs font-medium">
                    <Crown className="w-3 h-3 text-primary" />
                    <span>Top Creator</span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-heading font-bold text-base">{creator.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{creator.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{creator.fans} fan</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-chart-4 fill-chart-4" />
                        <span className="text-xs font-medium">{creator.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}