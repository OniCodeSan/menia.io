import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setValidSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Le password non coincidono");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authService.updatePassword(password);
      setDone(true);
      setTimeout(() => navigate("/student-dashboard", { replace: true }), 2000);
    } catch (err) {
      setError(err.message || "Errore inatteso");
    } finally {
      setSubmitting(false);
    }
  };

  if (validSession === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">Link scaduto</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Il link di recupero password è scaduto o non valido. Richiedi un nuovo link.
          </p>
          <Link to="/forgot-password">
            <Button className="bg-accent hover:bg-accent/90 font-semibold">Richiedi nuovo link</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden isolate">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-accent/[0.06] blur-3xl" />
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
          <h1 className="font-heading text-3xl font-bold mb-2">Nuova password</h1>
          <p className="text-muted-foreground text-sm">Scegli una nuova password per il tuo account.</p>
        </div>

        {done ? (
          <div className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-chart-3/10 border border-chart-3/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-chart-3" />
            </div>
            <h2 className="font-heading text-xl font-bold">Password aggiornata!</h2>
            <p className="text-sm text-muted-foreground">Stai per essere reindirizzato...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">Nuova password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Almeno 8 caratteri"
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
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Conferma password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ripeti la password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="pl-9 h-11 bg-secondary/40 border-border/50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-accent hover:bg-accent/90 font-semibold text-sm text-accent-foreground"
            >
              {submitting ? "Aggiornamento..." : "Salva nuova password"}
              {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
