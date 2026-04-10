import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, LogIn, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const location = useLocation();
  const [showCreatorGate, setShowCreatorGate] = useState(false);
  const gateRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (gateRef.current && !gateRef.current.contains(e.target)) setShowCreatorGate(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { label: "Feed", path: "/feed" },
    { label: "Esplora", path: "/explore" },
    { label: "Live", path: "/live-discover" },
    { label: "Messaggi", path: "/messages" },
    { label: "Dashboard", path: "/dashboard" },
  ];

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-primary group-hover:bg-primary/30 transition-all duration-300">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">Unlockr</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => base44.auth.redirectToLogin('/fan-dashboard')}
          >
            Accedi
          </Button>

          {/* Creator gate */}
          <div className="relative" ref={gateRef}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 glow-primary font-semibold"
              onClick={() => setShowCreatorGate(v => !v)}
            >
              Diventa Creator
            </Button>

            <AnimatePresence>
              {showCreatorGate && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-72 bg-card border border-border/50 rounded-2xl p-5 shadow-2xl z-50"
                >
                  <button onClick={() => setShowCreatorGate(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                  <p className="font-heading font-bold text-sm mb-1">Sei già tra i nostri creator?</p>
                  <p className="text-xs text-muted-foreground mb-4">Accedi al tuo account o inizia il percorso di registrazione.</p>
                  <div className="space-y-2">
                    <Button
                      className="w-full h-9 bg-primary hover:bg-primary/90 font-semibold text-sm"
                      onClick={() => { setShowCreatorGate(false); base44.auth.redirectToLogin('/dashboard'); }}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sì, accedi come Creator
                    </Button>
                    <Link to="/creator-onboarding" onClick={() => setShowCreatorGate(false)}>
                      <Button variant="outline" className="w-full h-9 border-border/50 text-sm font-semibold">
                        <Rocket className="w-4 h-4 mr-2" />
                        No, inizia la registrazione
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </motion.nav>
  );
}