import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Copy, Check, User, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickActions({ user, onNewCourse, onEditProfile }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const handleOrId = user.handle || user.id;
  const profileLink = `${window.location.origin}/trainer/${handleOrId}`;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const copy = async () => {
    await navigator.clipboard.writeText(profileLink);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-b border-border/30">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-lg font-bold flex-1">Dashboard</h1>
        <Button size="sm" onClick={() => onNewCourse?.()}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Nuovo corso
        </Button>
        <div className="relative" ref={menuRef}>
          <Button size="sm" variant="outline" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
            <User className="w-3.5 h-3.5 mr-1" /> Profilo
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </Button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-card overflow-hidden z-30">
              <button
                onClick={() => { setMenuOpen(false); onEditProfile?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary text-left"
              >
                <User className="w-4 h-4 text-primary" /> Modifica profilo
              </button>
              <Link
                to={`/trainer/${handleOrId}?preview=fan`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary"
              >
                <Eye className="w-4 h-4 text-primary" /> Vedi come studente
              </Link>
              <button
                onClick={copy}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary text-left"
              >
                {copied ? <Check className="w-4 h-4 text-chart-3" /> : <Copy className="w-4 h-4 text-primary" />}
                {copied ? "Link copiato" : "Copia link profilo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
