import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, Rocket, Coins, ChevronDown, User, Settings, LogOut, Menu, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { walletService } from "@/lib/wallet";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import TToken from "@/components/shared/TToken";
import { canCreatorUse, TOKEN_PACKS } from "@/lib/plans";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: currentUser, logout } = useAuth();
  const nav = t.nav;
  const [showCreatorGate, setShowCreatorGate] = useState(false);
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userWallet, setUserWallet] = useState(null);
  const gateRef = useRef(null);
  const tokenRef = useRef(null);
  const userMenuRef = useRef(null);

  // logo handled below
  const TOKEN_PACKAGES = TOKEN_PACKS.slice(0, 3).map((p) => ({
    tokens: p.tokens,
    price: p.eur,
  }));

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setUserWallet(null);
      return;
    }
    walletService.getUserWallet(currentUser.id).then((w) => {
      if (!cancelled) setUserWallet(w);
    });
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    const handler = (e) => {
      if (gateRef.current && !gateRef.current.contains(e.target)) setShowCreatorGate(false);
      if (tokenRef.current && !tokenRef.current.contains(e.target)) setShowTokenMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

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
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50 pt-safe"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/tokaro-logo.png"
            alt="Tokaro.fans"
            className="w-9 h-9 rounded-full group-hover:scale-105 transition-transform duration-300"
          />
          <span className="font-heading font-bold text-lg tracking-tight">Tokaro.fans</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.path.split("?")[0]
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {/* Go Live button for creators */}
          {currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') && canCreatorUse("go_live", currentUser.plan, currentUser.role) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-semibold gap-1.5"
              onClick={() => navigate('/go-live')}
            >
              <Radio className="w-4 h-4" />
              Go Live
            </Button>
          )}

          {/* Token wallet + purchase (combined) */}
          {currentUser && (<div className="relative" ref={tokenRef}>
            <button
              onClick={() => setShowTokenMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-chart-4 bg-chart-4/10 hover:bg-chart-4/20 transition-all border border-chart-4/30"
              aria-label="Token wallet"
            >
              <Coins className="w-4 h-4" />
              {userWallet ? <>{userWallet.balance.toLocaleString()} <TToken /></> : nav.wallet}
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
                      <p className="text-sm font-bold">{pkg.tokens} Token</p>
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
          </div>)}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                aria-label="Menu utente"
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
                      onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
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
              onClick={() => navigate('/fan-login')}
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
                          onClick={() => { setShowCreatorGate(false); navigate('/creator-login'); }}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          {nav.creatorGate.loginBtn}
                        </Button>
                        <Link to="/creator-login?mode=register" onClick={() => setShowCreatorGate(false)}>
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

        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu((v) => !v)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          aria-label="Menu"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile slide-out menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border/30 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3 bg-card/95 backdrop-blur-lg">
              {currentUser && (
                <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{currentUser.full_name || nav.profile}</p>
                    <p className="text-[11px] text-muted-foreground">{currentUser.email}</p>
                  </div>
                  {userWallet && (
                    <Link
                      to="/token-wallet"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-chart-4 bg-chart-4/10 border border-chart-4/30"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      {userWallet.balance.toLocaleString()} <TToken />
                    </Link>
                  )}
                </div>
              )}

              {currentUser ? (
                <>
                  <Link
                    to={currentUser.role === "creator" || currentUser.role === "admin" ? "/dashboard" : "/fan-dashboard"}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Impostazioni
                  </Link>
                  {(currentUser.role === 'creator' || currentUser.role === 'admin') && canCreatorUse("go_live", currentUser.plan, currentUser.role) && (
                    <button
                      onClick={() => { setShowMobileMenu(false); navigate("/go-live"); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-sm text-red-400 font-semibold"
                    >
                      <Radio className="w-4 h-4" />
                      Go Live
                    </button>
                  )}
                  <button
                    onClick={() => { logout(); setShowMobileMenu(false); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full h-10 bg-primary hover:bg-primary/90 font-semibold text-sm"
                    onClick={() => { setShowMobileMenu(false); navigate("/fan-login"); }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {nav.login}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 border-border/50 font-semibold text-sm"
                    onClick={() => { setShowMobileMenu(false); navigate("/creator-login"); }}
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    {nav.becomeCreator}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}