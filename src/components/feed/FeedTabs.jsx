import { Zap, TrendingUp, Compass, Radio } from "lucide-react";

const TABS = [
  { id: "foryou",       label: "For You",       icon: Zap,        desc: "Personalizzato per te" },
  { id: "highspenders", label: "Premium",        icon: TrendingUp, desc: "Top spender content" },
  { id: "discovery",    label: "Discovery",      icon: Compass,    desc: "Nuovi creator" },
  { id: "live",         label: "Live Now",       icon: Radio,      desc: "Dirette attive" },
];

export default function FeedTabs({ activeTab, setTab, livCount = 0 }) {
  return (
    <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl overflow-x-auto scrollbar-none">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === id
              ? "bg-primary text-primary-foreground glow-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
          {id === "live" && livCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
              {livCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}