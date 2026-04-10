import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Loader2, Camera, Tag, DollarSign, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = ["Fitness & Wellness", "Musica", "Fotografia", "Cucina", "Viaggi", "Tech", "Arte", "Gaming", "Moda", "Business", "Educazione", "Lifestyle"];

const STEPS = [
  { id: "welcome", label: "Benvenuto", icon: Sparkles },
  { id: "profile", label: "Profilo", icon: Camera },
  { id: "category", label: "Categoria", icon: Tag },
  { id: "pricing", label: "Prezzi", icon: DollarSign },
  { id: "done", label: "Pronto!", icon: Rocket },
];

function ProgressBar({ stepIndex }) {
  const pct = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
        <span>Step {stepIndex + 1} di {STEPS.length}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ displayName: "", bio: "", category: "", tags: "" });
  const [pricing, setPricing] = useState({ monthly: "9.99", yearly: "89.99", free: false });

  const step = STEPS[stepIndex].id;
  const next = () => setStepIndex(i => i + 1);
  const back = () => setStepIndex(i => i - 1);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        role: "creator",
        display_name: profile.displayName,
        bio: profile.bio,
        category: profile.category,
        tags: profile.tags,
        monthly_price: parseFloat(pricing.monthly),
        yearly_price: parseFloat(pricing.yearly),
        onboarding_complete: true,
      });
    } catch (e) { /* ignore */ }
    setSaving(false);
    next();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/8 blur-[140px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-xl font-bold">Unlockr</span>
          </div>
        </div>

        <div className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm">
          {/* Progress */}
          {step !== "done" && (
            <div className="mb-8">
              <ProgressBar stepIndex={stepIndex} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* WELCOME */}
            {step === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-bold mb-2">Benvenuto su Unlockr!</h1>
                  <p className="text-sm text-muted-foreground">Siamo felici di averti con noi. In pochi minuti configurerai il tuo profilo creator e inizierai a guadagnare con i tuoi contenuti.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Configura profilo", icon: Camera },
                    { label: "Scegli categoria", icon: Tag },
                    { label: "Imposta prezzi", icon: DollarSign },
                  ].map(({ label, icon: Icon }) => (
                    <div key={label} className="bg-secondary/30 rounded-xl p-3">
                      <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={next} className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold">
                  Inizia ora <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* PROFILE */}
            {step === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="font-heading font-bold text-lg mb-1">Il tuo profilo</h2>
                  <p className="text-xs text-muted-foreground">Come vuoi apparire ai tuoi fan?</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome pubblico *</Label>
                  <Input
                    value={profile.displayName}
                    onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="Es. Giulia Fit"
                    className="bg-secondary/30 border-border/30 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  <textarea
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Descriviti in poche righe. Cosa offri ai tuoi fan?"
                    maxLength={200}
                    className="w-full h-24 bg-secondary/30 border border-border/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{profile.bio.length}/200</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="flex-1 h-10 border-border/50">Indietro</Button>
                  <Button onClick={next} disabled={!profile.displayName.trim()} className="flex-1 h-10 bg-primary hover:bg-primary/90 font-semibold">Continua</Button>
                </div>
              </motion.div>
            )}

            {/* CATEGORY */}
            {step === "category" && (
              <motion.div key="category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="font-heading font-bold text-lg mb-1">La tua categoria</h2>
                  <p className="text-xs text-muted-foreground">Aiuterà i fan a trovarti più facilmente</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setProfile(p => ({ ...p, category: cat }))}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                        profile.category === cat
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/30 border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tag (opzionale, separati da virgola)</Label>
                  <Input
                    value={profile.tags}
                    onChange={e => setProfile(p => ({ ...p, tags: e.target.value }))}
                    placeholder="Es. yoga, hiit, nutrizione"
                    className="bg-secondary/30 border-border/30 h-10"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="flex-1 h-10 border-border/50">Indietro</Button>
                  <Button onClick={next} disabled={!profile.category} className="flex-1 h-10 bg-primary hover:bg-primary/90 font-semibold">Continua</Button>
                </div>
              </motion.div>
            )}

            {/* PRICING */}
            {step === "pricing" && (
              <motion.div key="pricing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="font-heading font-bold text-lg mb-1">Imposta i prezzi</h2>
                  <p className="text-xs text-muted-foreground">Puoi modificarli in qualsiasi momento dalla dashboard</p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground">
                  💡 I creator con prezzi tra €7–€12/mese hanno il miglior tasso di conversione
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Piano mensile (€)</Label>
                    <Input
                      type="number"
                      value={pricing.monthly}
                      onChange={e => setPricing(p => ({ ...p, monthly: e.target.value }))}
                      className="bg-secondary/30 border-border/30 h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Piano annuale (€)</Label>
                    <Input
                      type="number"
                      value={pricing.yearly}
                      onChange={e => setPricing(p => ({ ...p, yearly: e.target.value }))}
                      className="bg-secondary/30 border-border/30 h-10"
                    />
                    <p className="text-[11px] text-chart-3">
                      {pricing.monthly && pricing.yearly
                        ? `Risparmio fan: ${Math.round((1 - parseFloat(pricing.yearly) / (parseFloat(pricing.monthly) * 12)) * 100)}%`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="flex-1 h-10 border-border/50">Indietro</Button>
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 h-10 bg-primary hover:bg-primary/90 glow-primary font-semibold">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : "Completa setup"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* DONE */}
            {step === "done" && (
              <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 py-4">
                <div className="w-20 h-20 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-chart-3" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Sei pronto, {profile.displayName}! 🚀</h2>
                  <p className="text-sm text-muted-foreground">Il tuo profilo creator è configurato. Inizia subito a pubblicare contenuti e guadagnare.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => navigate("/dashboard")} className="h-10 bg-primary hover:bg-primary/90 font-semibold">
                    Vai alla dashboard
                  </Button>
                  <Button onClick={() => navigate("/dashboard?tab=publish")} variant="outline" className="h-10 border-border/50">
                    Pubblica subito
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">© 2026 Unlockr</p>
      </div>
    </div>
  );
}