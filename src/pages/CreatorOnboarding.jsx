import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, Camera, Tag,
  DollarSign, Rocket, Sparkles, Zap, Dumbbell, Music, UtensilsCrossed,
  Plane, Laptop, Palette, Gamepad2, Shirt, Briefcase, BookOpen,
  Heart, Users, TrendingUp, Star, Play, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { label: "Fitness & Wellness", icon: Dumbbell },
  { label: "Musica", icon: Music },
  { label: "Cucina", icon: UtensilsCrossed },
  { label: "Viaggi", icon: Plane },
  { label: "Tech", icon: Laptop },
  { label: "Arte", icon: Palette },
  { label: "Gaming", icon: Gamepad2 },
  { label: "Moda", icon: Shirt },
  { label: "Business", icon: Briefcase },
  { label: "Educazione", icon: BookOpen },
  { label: "Lifestyle", icon: Heart },
  { label: "Fotografia", icon: Camera },
];

const STEPS = [
  { id: "welcome", label: "Benvenuto" },
  { id: "profile", label: "Profilo" },
  { id: "category", label: "Categoria" },
  { id: "pricing", label: "Prezzi" },
  { id: "done", label: "Pronto!" },
];

const SIDE_CONTENT = {
  welcome: {
    title: "Trasforma la tua\npassione in profitto",
    subtitle: "Unisciti a migliaia di creator che guadagnano condividendo quello che amano.",
    stats: [
      { icon: Users, value: "50K+", label: "Creator attivi" },
      { icon: TrendingUp, value: "€2.4M", label: "Guadagnati dai creator" },
      { icon: Star, value: "4.9/5", label: "Soddisfazione media" },
    ],
  },
  profile: {
    title: "Il tuo profilo è\nla tua vetrina",
    subtitle: "Un profilo curato aumenta le iscrizioni del 3x. Scegli nome e bio che catturano.",
    stats: [
      { icon: Camera, value: "Bio", label: "Completa → +180% fan" },
      { icon: Star, value: "Nome", label: "Riconoscibile → +90% click" },
      { icon: Rocket, value: "Foto", label: "Con avatar → +240% fiducia" },
    ],
  },
  category: {
    title: "Raggiungi il tuo\npubblico ideale",
    subtitle: "La categoria giusta ti mette di fronte ai fan che cercano esattamente quello che offri.",
    stats: [
      { icon: TrendingUp, value: "12", label: "Categorie disponibili" },
      { icon: Users, value: "5x", label: "Più visibilità con categoria" },
      { icon: Zap, value: "Tag", label: "Migliora la ricerca organica" },
    ],
  },
  pricing: {
    title: "Guadagna fin\ndal primo giorno",
    subtitle: "Il prezzo giusto massimizza i tuoi guadagni. Puoi sempre modificarlo dopo.",
    stats: [
      { icon: DollarSign, value: "€9.99", label: "Prezzo medio mensile" },
      { icon: TrendingUp, value: "+25%", label: "In più con piano annuale" },
      { icon: Zap, value: "0%", label: "Commissioni il primo mese" },
    ],
  },
};

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const { user, updateUser, isLoadingAuth } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [profile, setProfile] = useState({ displayName: "", handle: "", bio: "", category: "", tags: "" });
  const [handleStatus, setHandleStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [pricing, setPricing] = useState({ monthly: "9.99", yearly: "89.99" });

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      navigate("/creator-login?mode=register", { replace: true });
      return;
    }
    if (user.role === "fan") {
      navigate("/fan-dashboard", { replace: true });
      return;
    }
    setProfile((p) => ({
      ...p,
      displayName: p.displayName || user.display_name || user.full_name || "",
      handle: p.handle || user.handle || "",
      bio: p.bio || user.bio || "",
      category: p.category || user.category || "",
      tags: p.tags || user.tags || "",
    }));
    if (user.monthly_price || user.yearly_price) {
      setPricing({
        monthly: user.monthly_price != null ? String(user.monthly_price) : "9.99",
        yearly: user.yearly_price != null ? String(user.yearly_price) : "89.99",
      });
    }
  }, [user, isLoadingAuth, navigate]);

  const step = STEPS[stepIndex].id;
  const next = () => setStepIndex(i => i + 1);
  const back = () => setStepIndex(i => i - 1);
  const side = SIDE_CONTENT[step] || SIDE_CONTENT.welcome;

  const checkHandle = async (value) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setProfile(p => ({ ...p, handle: clean }));
    if (!clean || clean.length < 3) { setHandleStatus(null); return; }
    setHandleStatus("checking");
    try {
      const available = await authService.isHandleAvailable(clean);
      setHandleStatus(available ? "available" : "taken");
    } catch {
      setHandleStatus(null);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await updateUser({
        role: "creator",
        full_name: profile.displayName,
        handle: profile.handle,
        bio: profile.bio,
        onboarding_complete: true,
      });
      setSaving(false);
      next();
    } catch (e) {
      setSaveError(e.message || "Errore durante il salvataggio");
      setSaving(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[160px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
        </div>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="relative w-full max-w-md text-center space-y-8"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center mx-auto glow-primary">
              <CheckCircle2 className="w-14 h-14 text-primary" />
            </div>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: Math.cos(i * 60 * Math.PI / 180) * 60, y: Math.sin(i * 60 * Math.PI / 180) * 60 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 1 }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2"
              />
            ))}
          </div>

          <div>
            <h1 className="font-heading text-3xl font-bold mb-3">
              Sei pronto, {profile.displayName}! 🚀
            </h1>
            <p className="text-muted-foreground">
              Il tuo profilo creator è configurato. Il pubblico ti aspetta — inizia a guadagnare adesso.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Fan potenziali", value: "50K+" },
              { icon: DollarSign, label: "Guadagno medio", value: "€340/m" },
              { icon: Zap, label: "Setup completato", value: "100%" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card/60 border border-border/30 rounded-2xl p-4">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="font-heading font-bold text-lg">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Button onClick={() => navigate("/dashboard")} className="w-full h-12 bg-primary hover:bg-primary/90 glow-primary font-semibold text-base">
              Vai alla dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-11 border-border/50 font-semibold">
              <Play className="w-4 h-4 mr-2" />
              Pubblica il primo contenuto
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 relative bg-gradient-to-br from-primary/20 via-background to-background flex-col justify-between p-10 border-r border-border/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-accent/10 blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        </div>

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-xl font-bold">Unlockr</span>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="font-heading text-3xl font-bold leading-tight mb-4 whitespace-pre-line">
                {side.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-10">
                {side.subtitle}
              </p>

              <div className="space-y-4">
                {side.stats.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-4 bg-card/40 border border-border/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-base leading-tight">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step dots */}
        <div className="relative flex items-center gap-2">
          {STEPS.filter(s => s.id !== "done").map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-8 bg-primary" : i < stepIndex ? "w-4 bg-primary/50" : "w-4 bg-border"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {stepIndex + 1} / {STEPS.length - 1}
          </span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading text-lg font-bold">Unlockr</span>
          </Link>
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile progress */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Step {stepIndex + 1} di {STEPS.length - 1}</span>
              <span>{Math.round((stepIndex / (STEPS.length - 2)) * 100)}%</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                animate={{ width: `${Math.round((stepIndex / (STEPS.length - 2)) * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* WELCOME */}
            {step === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Registrazione Creator
                  </div>
                  <h1 className="font-heading text-3xl font-bold mb-3">Inizia il tuo percorso 🎉</h1>
                  <p className="text-muted-foreground text-sm">In 4 semplici passi configurerai il tuo profilo e sarai pronto a guadagnare.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { step: "01", icon: Camera, label: "Configura il profilo", desc: "Nome, bio e avatar" },
                    { step: "02", icon: Tag, label: "Scegli la categoria", desc: "Fitness, musica, cucina e altro" },
                    { step: "03", icon: DollarSign, label: "Imposta i prezzi", desc: "Piano mensile e annuale" },
                    { step: "04", icon: Rocket, label: "Vai live!", desc: "Pubblica il primo contenuto" },
                  ].map(({ step: s, icon: Icon, label, desc }) => (
                    <div key={s} className="flex items-center gap-4 p-4 bg-card/40 border border-border/20 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground/40">{s}</span>
                    </div>
                  ))}
                </div>

                <Button onClick={next} className="w-full h-12 bg-primary hover:bg-primary/90 glow-primary font-semibold text-base">
                  Inizia ora <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Hai già un account?{" "}
                  <Link to="/creator-login" className="text-primary hover:underline font-medium">Accedi</Link>
                </p>
              </motion.div>
            )}

            {/* PROFILE */}
            {step === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-7">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-5">
                    <Camera className="w-3.5 h-3.5" />
                    Passo 1 — Profilo
                  </div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Come vuoi apparire?</h2>
                  <p className="text-sm text-muted-foreground">Queste info saranno visibili ai tuoi fan sul tuo profilo pubblico.</p>
                </div>

                {/* Avatar placeholder */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all">
                    <Camera className="w-6 h-6 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Foto profilo</p>
                    <p className="text-xs text-muted-foreground">Puoi aggiungerla dopo dalla dashboard</p>
                  </div>
                </div>

                <div className="space-y-4">
                 <div className="space-y-1.5">
                   <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username *</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">@</span>
                     <Input
                       value={profile.handle}
                       onChange={e => checkHandle(e.target.value)}
                       placeholder="tuonome"
                       className={`bg-secondary/30 border-border/30 h-11 text-sm pl-7 ${
                         handleStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' :
                         handleStatus === 'available' ? 'border-chart-3 focus-visible:ring-chart-3' : ''
                       }`}
                     />
                   </div>
                   {handleStatus === 'checking' && <p className="text-[11px] text-muted-foreground">Controllo disponibilità...</p>}
                   {handleStatus === 'available' && <p className="text-[11px] text-chart-3">✓ @{profile.handle} è disponibile</p>}
                   {handleStatus === 'taken' && <p className="text-[11px] text-destructive">✗ @{profile.handle} è già in uso, scegli un altro</p>}
                 </div>

                 <div className="space-y-1.5">
                   <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome pubblico *</Label>
                    <Input
                      value={profile.displayName}
                      onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                      placeholder="Es. Giulia Fit"
                      className="bg-secondary/30 border-border/30 h-11 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bio</Label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Descriviti in poche righe. Cosa offri ai tuoi fan? Qual è la tua unicità?"
                      maxLength={200}
                      rows={4}
                      className="w-full bg-secondary/30 border border-border/30 rounded-xl px-3 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-muted-foreground">Una bio completa aumenta le iscrizioni del 180%</p>
                      <p className="text-[11px] text-muted-foreground">{profile.bio.length}/200</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="h-11 px-5 border-border/50">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={next} disabled={!profile.displayName.trim() || !profile.handle || handleStatus !== 'available'} className="flex-1 h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold">
                    Continua <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* CATEGORY */}
            {step === "category" && (
              <motion.div key="category" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-3/10 border border-chart-3/20 text-chart-3 text-xs font-semibold mb-5">
                    <Tag className="w-3.5 h-3.5" />
                    Passo 2 — Categoria
                  </div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Qual è il tuo mondo?</h2>
                  <p className="text-sm text-muted-foreground">Scegli la categoria che meglio descrive i tuoi contenuti.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => setProfile(p => ({ ...p, category: label }))}
                      className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border text-xs font-semibold transition-all ${
                        profile.category === label
                          ? "bg-primary/15 border-primary/50 text-primary shadow-lg shadow-primary/10"
                          : "bg-secondary/20 border-border/20 text-muted-foreground hover:border-border/50 hover:bg-secondary/40"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${profile.category === label ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tag (opzionale)</Label>
                  <Input
                    value={profile.tags}
                    onChange={e => setProfile(p => ({ ...p, tags: e.target.value }))}
                    placeholder="Es. yoga, hiit, nutrizione (separati da virgola)"
                    className="bg-secondary/30 border-border/30 h-11 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="h-11 px-5 border-border/50">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={next} disabled={!profile.category} className="flex-1 h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold">
                    Continua <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PRICING */}
            {step === "pricing" && (
              <motion.div key="pricing" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-4/10 border border-chart-4/20 text-chart-4 text-xs font-semibold mb-5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Passo 3 — Prezzi
                  </div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Quanto vale il tuo lavoro?</h2>
                  <p className="text-sm text-muted-foreground">Puoi modificare i prezzi in qualsiasi momento dalla dashboard.</p>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-semibold">Tip:</span> I creator con prezzi tra <span className="text-primary font-semibold">€7–€12/mese</span> ottengono il miglior tasso di conversione e fedeltà dei fan.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Monthly plan */}
                  <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Piano mensile</p>
                        <p className="text-xs text-muted-foreground">Rinnovo automatico ogni mese</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl px-3 py-2">
                        <span className="text-muted-foreground text-sm">€</span>
                        <input
                          type="number"
                          value={pricing.monthly}
                          onChange={e => setPricing(p => ({ ...p, monthly: e.target.value }))}
                          className="w-16 bg-transparent text-right font-heading font-bold text-xl focus:outline-none"
                          step="0.01"
                          min="1"
                        />
                        <span className="text-xs text-muted-foreground">/mese</span>
                      </div>
                    </div>
                  </div>

                  {/* Yearly plan */}
                  <div className="bg-card/50 border border-primary/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      CONSIGLIATO
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Piano annuale</p>
                        <p className="text-xs text-muted-foreground">Rinnovo automatico ogni anno</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl px-3 py-2">
                        <span className="text-muted-foreground text-sm">€</span>
                        <input
                          type="number"
                          value={pricing.yearly}
                          onChange={e => setPricing(p => ({ ...p, yearly: e.target.value }))}
                          className="w-16 bg-transparent text-right font-heading font-bold text-xl focus:outline-none"
                          step="0.01"
                          min="1"
                        />
                        <span className="text-xs text-muted-foreground">/anno</span>
                      </div>
                    </div>
                    {(() => {
                      const m = parseFloat(pricing.monthly);
                      const y = parseFloat(pricing.yearly);
                      if (m > 0 && y > 0) {
                        const saving = Math.round((1 - y / (m * 12)) * 100);
                        if (saving > 0) return (
                          <div className="flex items-center gap-1.5 text-xs text-chart-3 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            I fan risparmiano il {saving}% rispetto al mensile
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-destructive text-center">{saveError}</p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={back} className="h-11 px-5 border-border/50">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : <>Completa setup <Rocket className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="relative text-xs text-muted-foreground mt-10">© 2026 Unlockr · <Link to="/" className="hover:text-foreground">Home</Link></p>
      </div>
    </div>
  );
}