import { useState, useEffect, useRef, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Crown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function LiveChat({ liveId, onNewDonation }) {
  const { user } = useAuth();
  const instanceId = useId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const profileCache = useRef({});
  const onNewDonationRef = useRef(onNewDonation);
  onNewDonationRef.current = onNewDonation;

  const loadProfile = useCallback(async (userId) => {
    if (profileCache.current[userId]) return profileCache.current[userId];
    if (!hasSupabase) return { full_name: "Utente", avatar_url: null };
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", userId)
      .maybeSingle();
    const profile = data || { full_name: "Utente", avatar_url: null, role: "fan" };
    profileCache.current[userId] = profile;
    return profile;
  }, []);

  useEffect(() => {
    if (!hasSupabase || !liveId) return;

    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("live_id", liveId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(async ({ data }) => {
        if (!data) return;
        const enriched = await Promise.all(
          data.map(async (msg) => {
            const profile = await loadProfile(msg.user_id);
            return { ...msg, profile };
          })
        );
        setMessages(enriched);
      });

    const channelName = `live-chat-${liveId}-${instanceId.replace(/:/g, "")}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${liveId}` },
        async (payload) => {
          const msg = payload.new;
          const profile = await loadProfile(msg.user_id);
          const enriched = { ...msg, profile };
          setMessages((prev) => {
            const withoutOptimistic = prev.filter((m) => !m._optimistic || m.user_id !== msg.user_id || m.message !== msg.message);
            return [...withoutOptimistic.slice(-200), enriched];
          });
          if (msg.type === "donation" && onNewDonationRef.current) {
            onNewDonationRef.current({
              id: msg.id,
              user: profile.full_name,
              amount: msg.donation_amount,
              type: "donation",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, loadProfile]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || !liveId || !hasSupabase) return;
    const text = input.trim();
    setSending(true);
    setInput("");

    const optimistic = {
      id: `opt-${Date.now()}`,
      live_id: liveId,
      user_id: user.id,
      message: text,
      type: "chat",
      created_at: new Date().toISOString(),
      profile: profileCache.current[user.id] || { full_name: user.full_name || "Tu", avatar_url: user.avatar_url, role: user.role },
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { error } = await supabase.from("live_chat_messages").insert({
        live_id: liveId,
        user_id: user.id,
        message: text,
        type: "chat",
      });
      if (error) console.error("[LiveChat] insert error:", error.message);
    } catch (err) {
      console.error("[LiveChat] send error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg) => user && msg.user_id === user.id;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 scrollbar-none">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Nessun messaggio ancora. Inizia la conversazione!</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {msg.type === "donation" ? (
                <div className="flex items-center gap-2 bg-chart-4/10 border border-chart-4/25 rounded-xl px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-chart-4 shrink-0" />
                  {msg.profile?.avatar_url && (
                    <img src={msg.profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  <span className="text-xs font-semibold text-chart-4">{msg.profile?.full_name || "Utente"}</span>
                  <span className="text-xs text-muted-foreground flex-1">ha donato</span>
                  <span className="text-xs font-bold text-chart-4">{msg.donation_amount} T</span>
                </div>
              ) : msg.type === "system" ? (
                <div className="text-center">
                  <span className="text-[11px] text-muted-foreground">{msg.message}</span>
                </div>
              ) : (
                <div className={`flex items-start gap-2 ${isMe(msg) ? "flex-row-reverse" : ""}`}>
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                    {msg.profile?.avatar_url ? (
                      <img src={msg.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {(msg.profile?.full_name || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`max-w-[85%] ${isMe(msg) ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {msg.profile?.role === "creator" && !isMe(msg) && <Crown className="w-3 h-3 text-chart-4" />}
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {isMe(msg) ? "Tu" : msg.profile?.full_name || "Utente"}
                      </span>
                    </div>
                    <div className={`rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                      isMe(msg)
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary/60 rounded-bl-sm"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="px-3 py-3 border-t border-border/30">
        {user ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !sending && send()}
              placeholder="Scrivi nella chat..."
              className="flex-1 bg-secondary/40 border-border/30 h-9 text-sm"
              disabled={sending}
            />
            <Button
              onClick={send}
              disabled={!input.trim() || sending}
              size="icon"
              className="w-9 h-9 bg-primary hover:bg-primary/90 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            Accedi per partecipare alla chat
          </p>
        )}
      </div>
    </div>
  );
}
