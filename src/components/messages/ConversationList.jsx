import { motion } from "framer-motion";
import { Search, Lock, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const conversations = [
  {
    id: 1,
    name: "Giovanni M.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Ciao! Posso avere accesso al programma?",
    time: "2m",
    unread: 3,
    status: "Premium",
    paid: false,
  },
  {
    id: 2,
    name: "Alessia P.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Grazie mille per il contenuto! 🔥",
    time: "15m",
    unread: 0,
    status: "Abbonato",
    paid: false,
  },
  {
    id: 3,
    name: "Davide R.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    lastMessage: "🔒 Messaggio bloccato — sblocca per €4.99",
    time: "1h",
    unread: 1,
    status: "Free",
    paid: true,
  },
  {
    id: 4,
    name: "Chiara L.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Quando pubblichi il prossimo video?",
    time: "3h",
    unread: 0,
    status: "Abbonato",
    paid: false,
  },
  {
    id: 5,
    name: "Matteo G.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    lastMessage: "🔒 Messaggio bloccato — sblocca per €4.99",
    time: "5h",
    unread: 1,
    status: "Free",
    paid: true,
  },
  {
    id: 6,
    name: "Laura B.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Sei la mia creator preferita!",
    time: "1g",
    unread: 0,
    status: "Premium",
    paid: false,
  },
];

const statusColors = {
  Premium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Abbonato: "bg-primary/20 text-primary border-primary/30",
  Free: "bg-secondary text-muted-foreground border-border/30",
};

export default function ConversationList({ selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-base">Messaggi</h2>
          {totalUnread > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30"
            >
              <Bell className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">{totalUnread} nuovi</span>
            </motion.div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca fan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/40 border-border/30 h-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv, i) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left border-b border-border/20 ${
              selectedId === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={conv.avatar}
                alt={conv.name}
                className="w-11 h-11 rounded-full object-cover"
              />
              {conv.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {conv.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm font-semibold truncate ${conv.unread > 0 ? "text-foreground" : "text-foreground/80"}`}>
                  {conv.name}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{conv.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {conv.paid && <Lock className="w-3 h-3 text-primary shrink-0" />}
                <p className={`text-xs truncate ${conv.paid ? "text-primary/70 italic" : "text-muted-foreground"}`}>
                  {conv.lastMessage}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}