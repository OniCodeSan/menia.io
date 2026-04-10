import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();

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
          <Link to="/fan-portal">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Accedi
            </Button>
          </Link>
          <Link to="/creator-onboarding">
            <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary font-semibold">
              Diventa Creator
            </Button>
          </Link>
        </div>


      </div>

    </motion.nav>
  );
}