import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">La piattaforma #1 per creator</span>
            </motion.div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Guadagna di più dai tuoi fan,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent glow-text">
                automaticamente
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
              Pubblica contenuti esclusivi, automatizza il tuo funnel e trasforma ogni fan in un abbonato premium. Tutto in un'unica piattaforma.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/creator-onboarding">
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-primary font-semibold text-base px-8 h-12 w-full sm:w-auto group">
                  Diventa Creator
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="border-border/50 hover:bg-secondary font-medium text-base px-8 h-12 w-full sm:w-auto group">
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Esplora contenuti
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center gap-6"
            >
              <div className="flex -space-x-3">
                {[
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">+12.000 creator attivi</p>
                <p className="text-xs text-muted-foreground">24M Token generati questo mese</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden border border-border/50">
                <img
                  src="https://media.base44.com/images/public/69d7e617e5741f4884bb0c49/7ea2309f9_generated_c1ec0316.png"
                  alt="Creator"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                
                {/* Floating card */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-8 left-6 right-6 glass rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">Sara Rossi</p>
                        <p className="text-xs text-muted-foreground">@sararossi</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">84.000 T</p>
                      <p className="text-xs text-muted-foreground">questo mese</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-primary/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Fan</p>
                      <p className="text-sm font-bold">2.4K</p>
                    </div>
                    <div className="flex-1 bg-accent/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Premium</p>
                      <p className="text-sm font-bold">840</p>
                    </div>
                    <div className="flex-1 bg-chart-3/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Conv.</p>
                      <p className="text-sm font-bold">35%</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}