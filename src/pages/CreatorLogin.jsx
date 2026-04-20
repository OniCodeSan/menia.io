import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Crown, Mail, Lock, ArrowRight, Eye, EyeOff, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreatorLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login, register } = useAuth();
  const fromPath = location.state?.from;

  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      navigate(fromPath || "/admin-console", { replace: true });
    } else if (user.role === "creator") {
      navigate(user.onboarding_complete ? "/dashboard" : "/creator-onboarding", { replace: true });
    } else if (user.role === "fan") {
      navigate("/fan-dashboard", { replace: true });
    }
  }, [user, navigate, fromPath]);

  useEffect(() => {
    const next = searchParams.get("mode") === "register" ? "register" : "login";
    setMode(next);
  }, [searchParams]);

  const switchMode = (next) => {
    setError("");
    setEmail("");
    setPassword("");
    setFullName("");
    const params = new URLSearchParams(searchParams);
    if (next === "register") params.set("mode", "register");
    else params.delete("mode");
    setSearchParams(params, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register({ email, password, role: "creator", full_name: fullName });
        navigate("/creator-onboarding", { replace: true });
      } else {
        const u = await login({ email, password });
        if (u.role === "fan") {
          setError("Questo account è registrato come fan. Usa l'area fan per accedere.");
          setSubmitting(false);
          return;
        }
        if (u.role === "admin") {
          navigate(fromPath || "/admin-console", { replace: true });
          return;
        }
        navigate(u.onboarding_complete ? "/dashboard" : "/creator-onboarding", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Errore inatteso");
      setSubmitting(false);
    }
  };

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
          <h1 className="font-heading text-3xl font-bold mb-2">
            {mode === "register" ? "Diventa Creator" : "Accedi come Creator"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "register"
              ? "Crea il tuo account e inizia a monetizzare il tuo pubblico."
              : "Gestisci contenuti, fan e guadagni dalla tua dashboard."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm space-y-5"
        >
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="creator-name" className="text-sm font-medium">Nome pubblico</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="creator-name"
                  type="text"
                  placeholder="Come vuoi apparire?"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-9 h-11 bg-secondary/40 border-border/50"
                />
              </div>
            </div>
          )}

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
            <Label htmlFor="creator-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="creator-password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "register" ? "Almeno 6 caratteri" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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

          {mode === "login" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="creator-remember" checked={remember} onCheckedChange={setRemember} />
                <Label htmlFor="creator-remember" className="text-xs text-muted-foreground cursor-pointer">
                  Resta connesso
                </Label>
              </div>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Password dimenticata?
              </Link>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm"
          >
            {submitting
              ? mode === "register" ? "Creazione account..." : "Accesso in corso..."
              : mode === "register" ? "Crea account creator" : "Accedi alla dashboard"}
            {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === "login" ? (
            <p className="text-xs text-muted-foreground">
              Non sei ancora un creator?{" "}
              <button type="button" onClick={() => switchMode("register")} className="text-primary hover:underline font-medium">
                Registrati come creator
              </button>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hai già un account creator?{" "}
              <button type="button" onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">
                Accedi
              </button>
            </p>
          )}
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
