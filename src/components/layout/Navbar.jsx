import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, LogIn, Rocket, Coins, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";

export default function Navbar() {
  const location = useLocation();
  const { t } = useLanguage();
  const nav = t.nav;
  const [showCreatorGate, setShowCreatorGate] = useState(false);
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userWallet, setUserWallet] = useState(null);
  const gateRef = useRef(null);
  const tokenRef = useRef(null);
  const userMenuRef = useRef(null);

  const TOKEN_PACKAGES = [
    { tokens: 100, price: 10, label: "Starter" },
    { tokens: 250, price: 24, label: "Popular 🔥" },
    { tokens: 600, price: 54, label: "Pro" },
  ];

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) return;
      setCurrentUser(u);
      try {
        const wallets = await base44.entities.TokenWallet.filter({ user_id: u.id, wallet_type: "user" });
        if (wallets?.[0]) setUserWallet(wallets[0]);
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (gateRef.current && !gateRef.current.contains(e.target)) setShowCreatorGate(false);
      if (tokenRef.current && !tokenRef.current.contains(e.target)) setShowTokenMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { label: nav.feed, path: "/feed" },
    { label: nav.explore, path: "/explore" },
    ...(currentUser ? [
      { label: nav.live, path: "/live-discover" },
      { label: nav.messages, path: "/messages" },
      { label: nav.dashboard, path: "/dashboard" },
    ] : []),
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
          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User wallet balance */}
          {currentUser && (
            <Link to="/token-wallet" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-chart-4 bg-chart-4/10 hover:bg-chart-4/20 transition-all border border-chart-4/30">
              <Coins className="w-4 h-4" />
              {userWallet ? `${userWallet.balance.toLocaleString()} T` : nav.wallet}
            </Link>
          )}

          {/* Token purchase */}
          {currentUser && (<div className="relative" ref={tokenRef}>
            <button
              onClick={() => setShowTokenMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-chart-4 bg-chart-4/10 hover:bg-chart-4/20 transition-all border border-chart-4/30"
            >
              <Coins className="w-4 h-4" />
              {nav.buyTokens}
              <ChevronDown className={`w-3 h-3 transition-transform ${showTokenMenu ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showTokenMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-64 bg-card border border-border/50 rounded-2xl p-3 shadow-2xl z-50"
                >
                  <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wide">{nav.tokenPackages}</p>
                  {TOKEN_PACKAGES.map((pkg, i) => (
                    <Link
                      key={i}
                      to="/token-wallet"
                      onClick={() => setShowTokenMenu(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold">{pkg.tokens} Token</p>
                        <p className="text-xs text-muted-foreground">{pkg.label}</p>
                      </div>
                      <span className="text-sm font-bold text-chart-4">€{pkg.price}</span>
                    </Link>
                  ))}
                  <div className="border-t border-border/20 mt-2 pt-2">
                    <Link to="/token-wallet" onClick={() => setShowTokenMenu(false)}
                      className="block text-center text-xs text-primary hover:underline py-1">
                      {nav.viewWallet}
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-all border border-border/40"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium max-w-[80px] truncate">{currentUser.full_name?.split(' ')[0] || nav.profile}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-48 bg-card border border-border/50 rounded-xl p-1.5 shadow-2xl z-50"
                  >
                    <Link
                      to={currentUser.role === 'creator' || currentUser.role === 'admin' ? '/dashboard' : '/fan-dashboard'}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Impostazioni
                    </Link>
                    <button
                      onClick={() => base44.auth.logout('/')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => base44.auth.redirectToLogin('/fan-dashboard')}
            >
              {nav.login}
            </Button>
          )}

          {/* Creator gate / Pubblica */}
          <div className="relative" ref={gateRef}>
            {currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 glow-primary font-semibold"
                onClick={() => {
                  if (window.location.pathname === '/dashboard') {
                    window.dispatchEvent(new CustomEvent('navbar:publish'));
                  } else {
                    window.location.href = '/dashboard?action=publish';
                  }
                }}
              >
                Pubblica
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 glow-primary font-semibold"
                  onClick={() => setShowCreatorGate(v => !v)}
                >
                  {nav.becomeCreator}
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
                      <p className="font-heading font-bold text-sm mb-1">{nav.creatorGate.title}</p>
                      <p className="text-xs text-muted-foreground mb-4">{nav.creatorGate.subtitle}</p>
                      <div className="space-y-2">
                        <Button
                          className="w-full h-9 bg-primary hover:bg-primary/90 font-semibold text-sm"
                          onClick={() => { setShowCreatorGate(false); base44.auth.redirectToLogin('/dashboard'); }}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          {nav.creatorGate.loginBtn}
                        </Button>
                        <Link to="/creator-onboarding" onClick={() => setShowCreatorGate(false)}>
                          <Button variant="outline" className="w-full h-9 border-border/50 text-sm font-semibold">
                            <Rocket className="w-4 h-4 mr-2" />
                            {nav.creatorGate.registerBtn}
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

      </div>

    </motion.nav>
  );
}