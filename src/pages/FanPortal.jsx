import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Heart, Video, Radio, MessageCircle, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const BENEFITS = [
  { icon: Video, label: "Contenuti esclusivi", color: "text-primary" },
  { icon: Radio, label: "Live in diretta", color: "text-destructive" },
  { icon: MessageCircle, label: "Messaggi privati", color: "text-accent" },
  { icon: Heart, label: "Community riservata", color: "text-chart-5" },
];

export default function FanPortal() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      setChecking(false);
      return;
    }
    if (user.role === "fan" || user.role === "admin") {
      navigate("/fan-dashboard", { replace: true });
    } else if (user.role === "creator") {
      setAccessDenied(true);
      setChecking(false);
    } else {
      setChecking(false);
    }
  }, [user, isLoadingAuth, navigate]);

  const handleLogin = () => {
    navigate("/fan-login");
  };

  if (checking && !accessDenied) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-accent" />
            </div>
            <span className="font-heading text-2xl font-bold">Unlockr</span>
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">Area Fan</h1>
          <p className="text-muted-foreground text-sm">
            Accedi per sbloccare contenuti esclusivi dei tuoi creator preferiti.
          </p>
        </div>

        <div className="bg-card/60 border border-border/40 rounded-2xl p-8 backdrop-blur-sm">
          {accessDenied ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base mb-1">Area non disponibile</h3>
                <p className="text-sm text-muted-foreground">
                  Questo accesso è riservato ai fan. I creator hanno la propria area dedicata.
                </p>
              </div>
              <Link to="/creator-portal">
                <Button variant="outline" className="w-full border-border/50">
                  Vai all'area creator
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Benefits */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.label} className="flex items-center gap-2.5 bg-secondary/40 rounded-xl px-3 py-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${b.color}`} />
                      <span className="text-xs font-medium">{b.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Plans teaser */}
              <div className="mb-6 bg-accent/5 border border-accent/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-accent mb-2">Piani disponibili</p>
                <div className="flex gap-3">
                  <div className="flex-1 text-center bg-secondary/50 rounded-lg py-2">
                    <p className="text-sm font-bold">€9.99</p>
                    <p className="text-[10px] text-muted-foreground">/ mese</p>
                  </div>
                  <div className="flex-1 text-center bg-secondary/50 rounded-lg py-2">
                    <p className="text-sm font-bold">€89.99</p>
                    <p className="text-[10px] text-muted-foreground">/ anno</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full h-11 bg-accent hover:bg-accent/90 font-semibold text-sm text-accent-foreground"
              >
                Accedi come Fan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Sei un creator?{" "}
                  <Link to="/creator-portal" className="text-primary hover:underline font-medium">
                    Accedi all'area creator
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Unlockr · Tutti i diritti riservati
        </p>
      </motion.div>
    </div>
  );
}