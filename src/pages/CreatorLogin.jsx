import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Crown, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreatorLogin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        if (!u) return setChecking(false);
        if (u.role === "creator" || u.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else if (u.role === "fan") {
          navigate("/fan-dashboard", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    base44.auth.redirectToLogin("/dashboard");
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-2xl font-bold">Tokaro.fans</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold mb-2">Accedi come Creator</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci contenuti, fan e guadagni dalla tua dashboard.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="creator-email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="creator-email"
                type="email"
                placeholder="creator@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 h-11 bg-secondary/40 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="creator-password" className="text-sm font-medium">Password</Label>
              <button
                type="button"
                onClick={() => base44.auth.redirectToLogin("/dashboard")}
                className="text-xs text-primary hover:underline"
              >
                Password dimenticata?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="creator-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 pr-9 h-11 bg-secondary/40 border-border/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="creator-remember" checked={remember} onCheckedChange={setRemember} />
            <Label htmlFor="creator-remember" className="text-xs text-muted-foreground cursor-pointer">
              Resta connesso
            </Label>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm"
          >
            {submitting ? "Accesso in corso..." : "Accedi alla dashboard"}
            {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                oppure
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => base44.auth.redirectToLogin("/dashboard")}
            className="w-full h-11 border-border/50 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continua con Google
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Non sei ancora un creator?{" "}
            <Link to="/creator-onboarding" className="text-primary hover:underline font-medium">
              Inizia la registrazione
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Sei un fan?{" "}
            <Link to="/fan-login" className="text-accent hover:underline font-medium">
              Accedi all'area fan
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Tokaro.fans · Tutti i diritti riservati
        </p>
      </motion.div>
    </div>
  );
}
