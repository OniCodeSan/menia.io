import { motion } from "framer-motion";
import { Search, Bell, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function ConversationList({ selectedId, onSelect }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        // Single query: fetch all messages involving the user (newest first).
        // Replaces the previous 2N+3 queries (partner-ids × 2, profiles, then
        // lastMsg+unread per partner). Latest 200 messages are plenty for
        // conversation list summaries; older ones load when chat opens.
        const { data: msgs } = await supabase
          .from("direct_messages")
          .select("sender_id, receiver_id, message, created_at, read")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(200);

        if (cancelled) return;

        const lastByPartner = new Map();
        const unreadByPartner = new Map();
        for (const m of msgs || []) {
          const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          if (!lastByPartner.has(partnerId)) {
            lastByPartner.set(partnerId, m);
          }
          if (m.receiver_id === user.id && !m.read) {
            unreadByPartner.set(partnerId, (unreadByPartner.get(partnerId) || 0) + 1);
          }
        }

        const ids = [...lastByPartner.keys()];
        if (ids.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role")
          .in("id", ids);

        if (cancelled) return;
        const profileMap = {};
        profiles?.forEach((p) => { profileMap[p.id] = p; });

        const convos = ids.map((partnerId) => {
          const last = lastByPartner.get(partnerId);
          const p = profileMap[partnerId];
          return {
            id: partnerId,
            name: p?.full_name || "Utente",
            avatar: p?.avatar_url || null,
            role: p?.role || "fan",
            lastMessage: last?.message || "",
            lastAt: last?.created_at || "",
            unread: unreadByPartner.get(partnerId) || 0,
          };
        });

        convos.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
        if (!cancelled) {
          setConversations(convos);
        }
      } catch (err) {
        console.warn("[ConversationList]", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <div className="flex flex-col h-full">
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
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/40 border-border/30 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
            <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nessuna conversazione</p>
            <p className="text-xs text-muted-foreground/70">Vai al profilo di un creator per inviargli un messaggio</p>
          </div>
        ) : (
          filtered.map((conv, i) => (
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
                {conv.avatar ? (
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    loading="lazy"
                    decoding="async"
                    className="w-11 h-11 rounded-full object-cover bg-primary/15"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                    {initials(conv.name)}
                  </div>
                )}
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
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {conv.lastAt ? timeAgo(conv.lastAt) : ""}
                  </span>
                </div>
                <p className="text-xs truncate text-muted-foreground">{conv.lastMessage}</p>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}gg`;
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "?";
}
