import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  LayoutDashboard, Users, Wallet, ShoppingCart, Banknote,
  Palette, Shield, Bell, Settings, ScrollText, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/users", icon: Users, label: "Utenti" },
  { to: "/wallets", icon: Wallet, label: "Wallet" },
  { to: "/orders", icon: ShoppingCart, label: "Ordini" },
  { to: "/payouts", icon: Banknote, label: "Compensi" },
  { to: "/creators", icon: Palette, label: "Creator" },
  { to: "/moderation", icon: Shield, label: "Moderazione" },
  { to: "/notifications", icon: Bell, label: "Notifiche" },
  { to: "/config", icon: Settings, label: "Configurazione" },
  { to: "/audit-log", icon: ScrollText, label: "Audit Log" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const Sidebar = ({ mobile }) => (
    <nav className={`flex flex-col h-full ${mobile ? "" : ""}`}>
      <div className="px-5 py-6 border-b border-border">
        <h1 className="text-lg font-bold text-brand">Menia Admin</h1>
        <p className="text-xs text-gray-500 mt-1 truncate">{user?.profile?.full_name || user?.email}</p>
      </div>
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-brand/15 text-brand font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut size={18} />
          Esci
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-surface-card border-r border-border flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-surface-card border-r border-border">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface-card border-b border-border">
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={22} className="text-gray-400" />
          </button>
          <span className="text-sm font-bold text-brand">Menia Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
