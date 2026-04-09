import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  
  const navLinks = [
    { label: "Feed", path: "/feed" },
    { label: "Esplora", path: "/explore" },
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
          <span className="font-heading font-bold text-lg tracking-tight">CreatorOS</span>
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
          <Link to="/feed">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Accedi
            </Button>
          </Link>
          <Link to="/feed">
            <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary font-semibold">
              Diventa Creator
            </Button>
          </Link>
        </div>

        {/* Mobile menu */}
        <button 
          className="md:hidden p-2 text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-strong border-b border-border/50 px-4 pb-4"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === link.path
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary font-semibold w-full">
                Diventa Creator
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}