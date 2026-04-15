import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Heart, MessageCircle, Share2, Bookmark, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function ContentPage() {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const isLocked = true;

  return (
    <div className="min-h-screen">
      {/* Back nav */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Torna al feed
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden border border-border/30"
            >
              <div className="relative aspect-video">
                <img
                  src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&h=500&fit=crop"
                  alt="Content"
                  className={`w-full h-full object-cover ${isLocked ? "blur-xl scale-105" : ""}`}
                />
                
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                    <div className="glass-strong rounded-2xl border border-border/50 p-8 text-center max-w-sm mx-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-primary">
                        <Lock className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-heading text-xl font-bold mb-2">Contenuto Premium</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Questo contenuto è riservato agli abbonati. Sblocca per accedere a tutti i contenuti esclusivi.
                      </p>
                      <div className="space-y-3">
                        <Link to="/checkout" className="block">
                          <Button className="w-full bg-primary hover:bg-primary/90 glow-primary font-semibold h-11">
                            <Crown className="w-4 h-4 mr-2" />
                            Sblocca contenuto — €4.99
                          </Button>
                        </Link>
                        <Link to="/checkout" className="block">
                          <Button variant="outline" className="w-full border-border/50 h-11">
                            Abbonati — €9.99/mese
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary/20 text-primary border-primary/30">Premium</Badge>
                </div>
              </div>
            </motion.div>

            {/* Content info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <h1 className="font-heading text-xl sm:text-2xl font-bold mb-3">
                Backstage del mio ultimo shooting esclusivo a Milano 🔥
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                <Link to="/creator" className="flex items-center gap-3 group">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                    alt="Creator"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">Marco Bianchi</p>
                    <p className="text-xs text-muted-foreground">4 ore fa</p>
                  </div>
                </Link>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Vi porto dietro le quinte del mio ultimo shooting a Milano. Location incredibile, team fantastico e risultati che non vi aspettate. In questo contenuto esclusivo vedrete tutto il processo creativo, dalla preparazione allo scatto finale.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-border/30 pt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLiked(!liked)}
                  className={liked ? "text-destructive" : "text-muted-foreground"}
                >
                  <Heart className={`w-4 h-4 mr-1.5 ${liked ? "fill-current" : ""}`} />
                  5.1K
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  203
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Condividi
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSaved(!saved)}
                  className={`ml-auto ${saved ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 border border-border/30 rounded-2xl p-5"
            >
              <Link to="/creator" className="flex items-center gap-3 mb-4 group">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                  alt="Creator"
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">Marco Bianchi</p>
                  <p className="text-xs text-muted-foreground">@marcob · 8.2K fan</p>
                </div>
              </Link>
              <Link to="/checkout">
                <Button className="w-full bg-primary hover:bg-primary/90 glow-primary font-semibold">
                  <Crown className="w-4 h-4 mr-2" />
                  Abbonati — €9.99/mese
                </Button>
              </Link>
            </motion.div>

            {/* More from creator */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 border border-border/30 rounded-2xl p-5"
            >
              <h3 className="font-heading font-bold text-sm mb-4">Altri da Marco</h3>
              <div className="space-y-3">
                {[
                  { title: "Lightroom presets esclusivi", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200&h=200&fit=crop", type: "premium" },
                  { title: "Street photography tips", image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&h=200&fit=crop", type: "free" },
                ].map((item) => (
                  <Link key={item.title} to="/content" className="flex items-center gap-3 group">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className={`w-full h-full object-cover ${item.type === "premium" ? "blur-sm" : ""}`}
                      />
                      {item.type === "premium" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                          <Lock className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <Badge className={`text-[10px] mt-1 ${item.type === "premium" ? "bg-primary/20 text-primary border-primary/30" : "bg-chart-3/20 text-chart-3 border-chart-3/30"}`}>
                        {item.type === "premium" ? "Premium" : "Free"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}