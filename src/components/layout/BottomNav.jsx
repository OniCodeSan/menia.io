import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Radio, MessageCircle, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const bn = t.bottomNav;

  const tabs = [
    { label: bn.home, path: "/", icon: Home },
    { label: bn.explore, path: "/explore", icon: Compass },
    { label: bn.live, path: "/live-discover", icon: Radio },
    { label: bn.messages, path: "/messages", icon: MessageCircle },
    { label: bn.dashboard, path: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-strong border-t border-border/50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {tabs.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/15" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-primary" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}