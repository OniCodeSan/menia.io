import { Link, useLocation } from "react-router-dom";
import { Home as HomeIcon, GraduationCap, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ITEMS = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/courses", label: "Corsi", icon: GraduationCap },
  { to: "/messages", label: "Messaggi", icon: MessageCircle, auth: true },
];

export default function BottomNav({ feedMode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (feedMode) return null;

  const dashboardHref =
    user?.role === "admin" ? "/admin-console" :
    user?.role === "creator" ? "/dashboard" :
    "/student-dashboard";

  const items = [
    ...ITEMS.filter((n) => !n.auth || user),
    user
      ? { to: dashboardHref, label: user.role === "creator" ? "Dashboard" : "Account", icon: User }
      : { to: "/student-login", label: "Accedi", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/30">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to + item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
