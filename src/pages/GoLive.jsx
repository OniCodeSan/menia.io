import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Video, Lock, DollarSign, Zap, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function GoLive() {
  const { user, isLoadingAuth } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Fitness");
  const [subOnly, setSubOnly] = useState(false);
  const [donationsEnabled, setDonationsEnabled] = useState(true);
  const [minDonation, setMinDonation] = useState("2");
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  const authorized = isLoadingAuth ? null : (user?.role === "creator" || user?.role === "admin");

  const handleStart = () => {
    if (!title.trim()) return;
    setIsStarting(true);
    setTimeout(() => navigate("/live"), 1500);
  };

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">Accesso riservato ai Creator</h2>
          <p className="text-muted-foreground text-sm max-w-xs">Solo i creator possono avviare una diretta. Diventa creator per accedere a questa funzione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link to="/live-discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Torna ai live
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl font-bold mb-1">Vai in diretta</h1>
          <p className="text-sm text-muted-foreground mb-8">Configura il tuo live stream e inizia a interagire con i tuoi fan</p>

          {/* Camera preview */}
          <div className="relative rounded-2xl overflow-hidden border border-border/30 aspect-video mb-8 bg-secondary/30">
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
              <Video className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Anteprima camera</p>
            </div>
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              Camera non attiva
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            <div className="bg-card/50 border border-border/30 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Impostazioni stream
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Titolo del live *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es. Q&A con i miei fan — rispondo a tutto!"
                    className="bg-secondary/30 border-border/30 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Fitness", "Fotografia", "Musica", "Gaming", "Talk", "Arte"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          category === cat
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-border/30 text-muted-foreground hover:border-border/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-chart-4" /> Monetizzazione
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-chart-4/15 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Donazioni live</p>
                      <p className="text-xs text-muted-foreground">I fan possono mandarti donazioni</p>
                    </div>
                  </div>
                  <Switch checked={donationsEnabled} onCheckedChange={setDonationsEnabled} />
                </div>

                {donationsEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pl-11"
                  >
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Donazione minima (Token)</Label>
                    <Input
                      value={minDonation}
                      onChange={(e) => setMinDonation(e.target.value)}
                      className="w-32 bg-secondary/30 border-border/30 h-9 text-sm"
                    />
                  </motion.div>
                )}

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Solo abbonati</p>
                      <p className="text-xs text-muted-foreground">Limita il live agli abbonati premium</p>
                    </div>
                  </div>
                  <Switch checked={subOnly} onCheckedChange={setSubOnly} />
                </div>
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={!title.trim() || isStarting}
              className="w-full h-12 bg-destructive hover:bg-destructive/90 font-semibold text-base"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />
                  Avvio in corso...
                </div>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  Inizia il live
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}