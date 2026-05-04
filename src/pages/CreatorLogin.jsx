import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Crown, Mail, Lock, ArrowRight, Eye, EyeOff, User, AlertCircle, Calendar } from "lucide-react";
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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      navigate(fromPath || "/admin-console", { replace: true });
    } else if (user.role === "creator") {
      navigate("/dashboard", { replace: true });
    } else if (user.role === "fan") {
      navigate("/student-dashboard", { replace: true });
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
    setDateOfBirth("");
    setTermsAccepted(false);
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
        if (!dateOfBirth) { setError("Data di nascita obbligatoria"); setSubmitting(false); return; }

        const ageRes = await fetch("/api/auth/validate-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date_of_birth: dateOfBirth, role: "creator" }),
        });
        const ageData = await ageRes.json();
        if (!ageRes.ok) { setError(ageData.error); setSubmitting(false); return; }

        await register({ email, password, role: "creator", full_name: fullName, date_of_birth: dateOfBirth });
        navigate("/dashboard", { replace: true });
      } else {
        const u = await login({ email, password });
        fetch("/api/auth/login-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, success: true }),
        }).catch(() => {});
        if (u.role === "fan") {
          setError("Questo account è registrato come studente. Usa l'area studenti per accedere.");
          setSubmitting(false);
          return;
        }
        if (u.role === "admin") {
          navigate(fromPath || "/admin-console", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      fetch("/api/auth/login-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, success: false, failure_reason: err.message }),
      }).catch(() => {});
      setError(err.message || "Errore inatteso");
      setSubmitting(false);
    }
  };

  const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden isolate">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-primary/[0.06] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/menia-logo.svg" alt="Menia.io" className="w-10 h-10 rounded-xl" />
            <span className="font-heading text-2xl font-bold">Menia.io</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold mb-2">
            {mode === "register" ? "Diventa Formatore" : "Accedi come Formatore"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "register"
              ? "Crea il tuo account e inizia a pubblicare i tuoi corsi."
              : "Gestisci corsi, studenti e community dalla tua dashboard."}
          </p>
          {mode === "register" && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-base">🎁</span>
              <span className="text-xs font-semibold text-primary">
                Iscriviti ora: 1 mese di piano Starter incluso
              </span>
            </div>
          )}
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
                placeholder={mode === "register" ? "Almeno 8 caratteri" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="creator-dob" className="text-sm font-medium">Data di nascita</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="creator-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={maxDate}
                  required
                  className="pl-9 h-11 bg-secondary/40 border-border/50"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Per diventare formatore devi avere almeno 18 anni</p>
            </div>
          )}

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

          {mode === "register" && (
            <div className="flex items-start gap-2">
              <Checkbox id="creator-terms" checked={termsAccepted} onCheckedChange={setTermsAccepted} className="mt-0.5" />
              <Label htmlFor="creator-terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                Accetto i{" "}
                <Link to="/terms" className="text-primary hover:underline" target="_blank">Termini e Condizioni</Link>
                {" "}e la{" "}
                <Link to="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</Link>
              </Label>
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
            disabled={submitting || (mode === "register" && (!termsAccepted || !dateOfBirth))}
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
            Sei uno studente?{" "}
            <Link to="/student-login" className="text-accent hover:underline font-medium">
              Accedi all'area studenti
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Menia.io · Tutti i diritti riservati
        </p>
      </motion.div>
    </div>
  );
}
