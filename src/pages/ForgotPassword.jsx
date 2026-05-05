import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Errore inatteso");
    } finally {
      setSubmitting(false);
    }
  };

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
            <img src="/menia-logo.png" alt="Menia.io" className="w-10 h-10 rounded-xl" />
            <span className="font-heading text-2xl font-bold">Menia.io</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold mb-2">Recupera password</h1>
          <p className="text-muted-foreground text-sm">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        {sent ? (
          <div className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-chart-3/10 border border-chart-3/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-chart-3" />
            </div>
            <h2 className="font-heading text-xl font-bold">Email inviata!</h2>
            <p className="text-sm text-muted-foreground">
              Controlla la tua casella email <span className="font-semibold text-foreground">{email}</span> e clicca sul link per reimpostare la password.
            </p>
            <p className="text-xs text-muted-foreground">
              Non trovi l'email? Controlla la cartella spam.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="tu@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
              {submitting ? "Invio in corso..." : "Invia link di recupero"}
              {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/student-login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" />
            Torna al login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
