import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import useCreatorKPI from "@/hooks/useCreatorKPI";
import CreatorSidebar from "./CreatorSidebar";

const SUBROUTE_LABELS = {
  "/dashboard/courses":    "Corsi",
  "/dashboard/lives":      "Live",
  "/dashboard/community":  "Community",
  "/dashboard/broadcasts": "Broadcast",
  "/dashboard/analytics":  "Analytics",
  "/dashboard/settings":   "Impostazioni",
};

function DashboardBreadcrumb() {
  const { pathname } = useLocation();
  const sub = SUBROUTE_LABELS[pathname];
  if (!sub) return null;
  return (
    <nav aria-label="breadcrumb" className="px-4 sm:px-6 pt-4 text-xs text-muted-foreground inline-flex items-center gap-1">
      <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-foreground font-semibold">{sub}</span>
    </nav>
  );
}

// Standalone layout for the creator dashboard: persistent left sidebar +
// content area. No top Navbar / BottomNav — the sidebar is the navigation.
// Fetches KPI data once and shares it with all child routes via Outlet context,
// so /dashboard, /dashboard/courses, /dashboard/lives… don't each refetch.
export default function DashboardLayout() {
  const { user, isLoadingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, refresh } = useCreatorKPI(user?.id);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (isLoadingAuth || (user && loading)) {
    return (
      <div className="min-h-screen bg-background flex">
        <CreatorSidebar onLogout={handleLogout} />
        <main className="flex-1 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <CreatorSidebar onLogout={handleLogout} />
      <main className="flex-1 min-w-0">
        <DashboardBreadcrumb />
        <Outlet context={{ user, data, refresh }} />
      </main>
    </div>
  );
}
