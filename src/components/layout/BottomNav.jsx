import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, PlusCircle, MessageCircle, LayoutDashboard, Menu, X, Settings, LogOut, LogIn, Rocket, User, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import TToken from "@/components/shared/TToken";

export default function BottomNav({ feedMode = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const bn = t.bottomNav;
  const nav = t.nav;
  const [menuOpen, setMenuOpen] = useState(false);

  const isCreator = user?.role === "creator" || user?.role === "admin";

  if (feedMode) {
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Feed navigation">
          <div className="flex items-center justify-between px-6 py-3 pb-safe bg-black/40 backdrop-blur-xl border-t border-white/10">
            {isCreator ? (
              <Link
                to="/dashboard?action=publish"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Pubblica
              </Link>
            ) : (
              <div />
            )}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-16 right-4 z-50 md:hidden w-56 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 space-y-0.5">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2 mb-1 border-b border-border/20">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold truncate">{user.full_name?.split(" ")[0] || "Profilo"}</span>
                  </div>
                )}
                <MenuLink to="/" label={bn.home} icon={Home} onClick={() => setMenuOpen(false)} />
                <MenuLink to="/explore" label={bn.explore} icon={Compass} onClick={() => setMenuOpen(false)} />
                {user && (
                  <>
                    <MenuLink to="/messages" label={bn.messages} icon={MessageCircle} onClick={() => setMenuOpen(false)} />
                    <MenuLink to={isCreator ? "/dashboard" : "/fan-dashboard"} label={bn.dashboard} icon={LayoutDashboard} onClick={() => setMenuOpen(false)} />
                    <MenuLink to={isCreator ? "/dashboard" : "/fan-dashboard"} label="Impostazioni" icon={Settings} onClick={() => setMenuOpen(false)} />
                  </>
                )}
                <div className="px-3 py-1.5">
                  <LanguageSwitcher />
                </div>
                {user ? (
                  <button
                    onClick={() => { logout(); setMenuOpen(false); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/fan-login"); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm"
                    >
                      <LogIn className="w-4 h-4 text-muted-foreground" />
                      {nav.login}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/creator-login"); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm"
                    >
                      <Rocket className="w-4 h-4 text-muted-foreground" />
                      {nav.becomeCreator}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const tabs = [
    { label: bn.home, path: "/", icon: Home },
    { label: bn.explore, path: "/explore", icon: Compass },
    ...(isCreator
      ? [{ label: "Pubblica", path: "/dashboard?action=publish", icon: PlusCircle, highlight: true }]
      : []),
    ...(user ? [
      { label: bn.messages, path: "/messages", icon: MessageCircle },
      { label: bn.dashboard, path: isCreator ? "/dashboard" : "/fan-dashboard", icon: LayoutDashboard },
    ] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-strong border-t border-border/50" aria-label="Navigazione principale">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {tabs.map(({ label, path, icon: Icon, highlight }) => {
          const active = location.pathname === path.split("?")[0];
          return (
            <Link
              key={label}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? "text-primary" : highlight ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                highlight ? "bg-primary/20 scale-110" : active ? "bg-primary/15" : ""
              }`}>
                <Icon className={`w-5 h-5 ${active || highlight ? "text-primary" : ""}`} />
              </div>
              <span className={`text-[10px] font-semibold ${active || highlight ? "text-primary" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MenuLink({ to, label, icon: Icon, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm"
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
