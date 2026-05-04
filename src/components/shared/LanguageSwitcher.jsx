import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const LANGS = [
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "pt", flag: "🇵🇹", label: "PT" },
];

export default function LanguageSwitcher() {
  const { lang, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGS.find(l => l.code === lang) || LANGS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Seleziona lingua"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border/40 text-xs font-semibold hover:bg-secondary transition-colors"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-10 w-28 bg-card border border-border/50 rounded-xl p-1 shadow-2xl z-50"
          >
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { changeLanguage(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  l.code === lang ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-foreground"
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
