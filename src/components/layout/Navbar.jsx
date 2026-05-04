import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LogIn, LogOut, User, ChevronDown, Settings, LayoutDashboard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import useBadgeCounts from "@/hooks/useBadgeCounts";
import MeniaLogo from "@/components/shared/MeniaLogo";
import NotificationBell from "@/components/notifications/NotificationBell";

const NAV = [
  { to: "/courses", label: "Corsi" },
  { to: "/trainer", label: "Formatori" },
  { to: "/pricing", label: "Piani" },
  { to: "/messages", label: "Messaggi", auth: true },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadMessages } = useBadgeCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const loginMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    if (!loginOpen && !userMenuOpen) return;
    const onDocClick = (e) => {
      if (loginOpen && loginMenuRef.current && !loginMenuRef.current.contains(e.target)) setLoginOpen(false);
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [loginOpen, userMenuOpen]);

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const dashboardHref =
    user?.role === "admin" ? "/admin-console" :
    user?.role === "creator" ? "/dashboard" :
    "/student-dashboard";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold">
          <MeniaLogo className="w-7 h-7" />
          <span>Menia</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.filter((n) => !n.auth || user).map((n) => {
            const badge = n.to === "/messages" ? unreadMessages : 0;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 ${
                  isActive(n.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <div className="relative hidden sm:inline-flex" ref={userMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <User className="w-4 h-4 mr-1.5" />
                  {user.role === "admin" ? "Admin" : user.role === "creator" ? "Dashboard" : "Area studenti"}
                  <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </Button>
                {userMenuOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-card overflow-hidden z-50">
                    <Link to={dashboardHref} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      {user.role === "creator" ? "Dashboard" : "La mia area"}
                    </Link>
                    {user.role !== "creator" && user.role !== "admin" && (
                      <Link to="/student-settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary">
                        <Settings className="w-4 h-4 text-primary" /> Impostazioni
                      </Link>
                    )}
                    {user.role === "creator" && (
                      <Link to="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary">
                        <Settings className="w-4 h-4 text-primary" /> Impostazioni
                      </Link>
                    )}
                    <div className="border-t border-border" />
                    <button
                      onClick={() => { setUserMenuOpen(false); setLogoutConfirm(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary text-left text-destructive"
                    >
                      <LogOut className="w-4 h-4" /> Esci
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative" ref={loginMenuRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLoginOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={loginOpen}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogIn className="w-4 h-4 mr-1.5" /> Accedi
                  <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${loginOpen ? "rotate-180" : ""}`} />
                </Button>
                {loginOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-card overflow-hidden z-50"
                  >
                    <Link
                      to="/student-login"
                      onClick={() => setLoginOpen(false)}
                      className="block px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <p className="text-sm font-semibold">Studente</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Accedi ai corsi acquistati</p>
                    </Link>
                    <div className="border-t border-border" />
                    <Link
                      to="/trainer-login"
                      onClick={() => setLoginOpen(false)}
                      className="block px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <p className="text-sm font-semibold">Formatore</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pubblica e gestisci i tuoi corsi</p>
                    </Link>
                  </div>
                )}
              </div>
              <Link to="/student-login?mode=register" className="hidden sm:inline-flex">
                <Button size="sm">Inizia gratis</Button>
              </Link>
            </div>
          )}
          <button onClick={() => setOpen((v) => !v)} className="md:hidden p-2">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-heading font-bold text-base">Esci dall'account</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Vuoi davvero disconnetterti? Dovrai accedere di nuovo per usare i contenuti del tuo abbonamento.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLogoutConfirm(false)} className="flex-1">Annulla</Button>
              <Button variant="destructive" onClick={async () => { setLogoutConfirm(false); await handleLogout(); }} className="flex-1">
                <LogOut className="w-4 h-4 mr-1.5" /> Esci
              </Button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-border/30 bg-background">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
            {NAV.filter((n) => !n.auth || user).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActive(n.to) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to={dashboardHref} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary inline-flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  {user.role === "admin" ? "Admin" : user.role === "creator" ? "Dashboard" : "La mia area"}
                </Link>
                <Link to={user.role === "creator" ? "/dashboard/settings" : "/student-settings"} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary inline-flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Impostazioni
                </Link>
                <button
                  onClick={() => { setOpen(false); setLogoutConfirm(true); }}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-destructive hover:bg-secondary inline-flex items-center gap-2 text-left"
                >
                  <LogOut className="w-4 h-4" /> Esci
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-border/30 my-1" />
                <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accedi come</p>
                <Link to="/student-login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold hover:bg-secondary inline-flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Studente
                </Link>
                <Link to="/trainer-login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold hover:bg-secondary inline-flex items-center gap-2">
                  <User className="w-4 h-4" /> Formatore
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
