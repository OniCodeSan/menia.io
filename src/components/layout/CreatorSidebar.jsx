import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, GraduationCap, Radio, Users, BarChart3, Settings,
  Menu, X, LogOut, Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import MeniaLogo from "@/components/shared/MeniaLogo";

// Each section is its own route under /dashboard. Active state comes from the
// URL — no scroll tracking needed.
const SECTIONS = [
  { route: "/dashboard",            label: "Dashboard",    icon: LayoutDashboard },
  { route: "/dashboard/courses",    label: "Corsi",        icon: GraduationCap },
  { route: "/dashboard/community",  label: "Community",    icon: Users },
  { route: "/dashboard/broadcasts", label: "Broadcast",    icon: Megaphone },
  { route: "/dashboard/analytics",  label: "Analytics",    icon: BarChart3 },
  { route: "/dashboard/settings",   label: "Impostazioni", icon: Settings },
];

export default function CreatorSidebar({ onLogout }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const goTo = (route) => {
    setMobileOpen(false);
    navigate(route);
  };

  const isActive = (route) =>
    route === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname === route || location.pathname.startsWith(route + "/");

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-card border border-border shadow-card"
        aria-label="Apri menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <MeniaLogo className="w-6 h-6" />
            <span className="text-base">Menia</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-md hover:bg-sidebar-accent"
            aria-label="Chiudi menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SECTIONS.map((s) => {
            const active = isActive(s.route);
            return (
              <button
                key={s.route}
                type="button"
                onClick={() => goTo(s.route)}
                className={`w-full relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" aria-hidden />
                )}
                <s.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                {(user.full_name || user.email || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.full_name || user.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{user.handle || user.id?.slice(0, 8)}</p>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
