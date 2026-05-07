import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Server, Send, Users, Shield, FileText, LogOut, Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

// =============================================================================
// Odino — Admin control center for Menia.io
// Hosted on odino.menia.io. Separate Vite build (dist-admin).
// Routing flat: /login, /, /sistema, /messaggi, /utenti, /accessi.
// =============================================================================

const DashboardPage = lazy(() => import("@/pages/admin/Dashboard"));
const SystemPage = lazy(() => import("@/pages/admin/System"));
const MessagesPage = lazy(() => import("@/pages/admin/Messages"));
const UsersPage = lazy(() => import("@/pages/admin/Users"));
const AccessPage = lazy(() => import("@/pages/admin/Access"));
const AuditPage = lazy(() => import("@/pages/admin/Audit"));
const LoginPage = lazy(() => import("@/pages/admin/Login"));

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/sistema", label: "Sistema", icon: Server },
  { to: "/messaggi", label: "Messaggi", icon: Send },
  { to: "/utenti", label: "Utenti", icon: Users },
  { to: "/accessi", label: "Accessi", icon: Shield },
  { to: "/audit", label: "Audit", icon: FileText },
];

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function Shell({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border/30 bg-card/30 flex flex-col">
        <div className="px-5 py-5 border-b border-border/30">
          <h1 className="font-heading text-xl font-bold tracking-tight">Odino</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Menia control</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-border/30 text-xs text-muted-foreground">
          <div className="truncate" title={user?.email}>{user?.email}</div>
          <button
            onClick={onLogout}
            className="mt-2 flex items-center gap-2 text-xs hover:text-foreground"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<Spinner />}>{children}</Suspense>
      </main>
    </div>
  );
}

function AdminGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "admin") setDenied(true);
  }, [isLoadingAuth, user, navigate]);

  if (isLoadingAuth) return <Spinner />;
  if (!user) return null;
  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-heading font-bold mb-2">Accesso negato</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Solo gli amministratori possono accedere a Odino.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login", { replace: true });
            }}
            className="text-sm underline"
          >
            Accedi con un altro account
          </button>
        </div>
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminGuard><DashboardPage /></AdminGuard>} />
            <Route path="/sistema" element={<AdminGuard><SystemPage /></AdminGuard>} />
            <Route path="/messaggi" element={<AdminGuard><MessagesPage /></AdminGuard>} />
            <Route path="/utenti" element={<AdminGuard><UsersPage /></AdminGuard>} />
            <Route path="/accessi" element={<AdminGuard><AccessPage /></AdminGuard>} />
            <Route path="/audit" element={<AdminGuard><AuditPage /></AdminGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
