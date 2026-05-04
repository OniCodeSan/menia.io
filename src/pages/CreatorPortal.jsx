import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Crown, Zap, BarChart2, Users, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: BarChart2, label: "Analytics avanzate", color: "text-primary" },
  { icon: Users, label: "Gestione studenti & CRM", color: "text-accent" },
  { icon: Zap, label: "Contenuti Premium", color: "text-chart-4" },
  { icon: Crown, label: "Boost visibilità", color: "text-chart-5" },
];

export default function CreatorPortal() {
  const navigate = useNavigate();
  const { user, logout, isLoadingAuth } = useAuth();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      setChecking(false);
      return;
    }
    if (user.role === "creator" || user.role === "admin") {
      navigate("/dashboard", { replace: true });
    } else {
      setAccessDenied(true);
      setChecking(false);
    }
  }, [user, isLoadingAuth, navigate]);

  const handleLogin = () => {
    navigate("/trainer-login");
  };

  if (checking && !accessDenied) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-2xl font-bold">Menia.io</span>
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">Area Formatori</h1>
          <p className="text-muted-foreground text-sm">
            Accedi alla tua dashboard per gestire corsi, studenti e community.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-base">🎁</span>
            <span className="text-xs font-semibold text-primary">
              1 mese di Starter incluso per i nuovi iscritti
            </span>
          </div>
        </div>

        <div className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm">
          {accessDenied ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base mb-1">Accesso non autorizzato</h3>
                <p className="text-sm text-muted-foreground">
                  Il tuo account non ha i permessi di creator. Contatta il supporto o registrati come creator.
                </p>
              </div>
              <Button variant="outline" className="w-full border-border/50" onClick={async () => { await logout(); navigate('/trainer-login'); }}>
                Esci e cambia account
              </Button>
            </div>
          ) : (
            <>
              {/* Features list */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="flex items-center gap-2.5 bg-secondary/40 rounded-xl px-3 py-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${f.color}`} />
                      <span className="text-xs font-medium">{f.label}</span>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleLogin}
                className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm"
              >
                Accedi come Creator
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Sei uno studente?{" "}
                  <Link to="/student-portal" className="text-primary hover:underline font-medium">
                    Accedi all'area studenti
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Menia.io · Tutti i diritti riservati
        </p>
      </motion.div>
    </div>
  );
}