import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import useNotifications from "@/hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const { items, badge, count, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label={`Notifiche${count ? ` (${count} non lette)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          items={items}
          count={count}
          onMarkAsRead={markAsRead}
          onMarkAllRead={markAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
