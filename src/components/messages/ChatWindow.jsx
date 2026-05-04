import { useState, useRef, useEffect, useId } from "react";
import { motion } from "framer-motion";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function ChatWindow({ conversation, onBack }) {
  const { user } = useAuth();
  const instanceId = useId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const partnerId = conversation.id;

  useEffect(() => {
    if (!hasSupabase || !user || !partnerId) return;
    setLoading(true);
    setMessages([]);

    supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (error) console.warn("[ChatWindow] load:", error.message);
        setMessages(data || []);
        setLoading(false);
      });

    supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user.id)
      .eq("read", false)
      .then(() => {});

    const channelName = `dm-${[user.id, partnerId].sort().join("-")}-${instanceId.replace(/:/g, "")}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new;
          const relevant =
            (msg.sender_id === user.id && msg.receiver_id === partnerId) ||
            (msg.sender_id === partnerId && msg.receiver_id === user.id);
          if (!relevant) return;
          setMessages((prev) => {
            const filtered = prev.filter((m) => !m._optimistic || m.sender_id !== msg.sender_id || m.message !== msg.message);
            return [...filtered, msg];
          });
          if (msg.sender_id === partnerId) {
            supabase.from("direct_messages").update({ read: true }).eq("id", msg.id).then(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, instanceId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !partnerId || !hasSupabase) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      receiver_id: partnerId,
      message: text,
      read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        message: text,
      });
      if (error) console.error("[DM] insert error:", error.message);
    } catch (err) {
      console.error("[DM] send error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isMe = (msg) => msg.sender_id === user?.id;
  const roleLabel = conversation.role === "creator" ? "Creator" : conversation.role === "admin" ? "Admin" : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/30">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden w-8 h-8 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <img src={conversation.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{conversation.name}</p>
            {roleLabel && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">{roleLabel}</Badge>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nessun messaggio. Inizia la conversazione!</p>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 px-4 ${isMe(msg) ? "flex-row-reverse" : ""}`}
            >
              <img
                src={isMe(msg)
                  ? (user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || "U")}&background=7c3aed&color=fff&size=100`)
                  : conversation.avatar}
                alt="" className="w-7 h-7 rounded-full object-cover shrink-0"
              />
              <div className={`rounded-2xl px-4 py-2.5 max-w-[75%] ${isMe(msg) ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary/80 rounded-bl-sm"}`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe(msg) ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.created_at)}</p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border/30 bg-card/30">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-secondary/40 border-border/30 h-10"
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || sending} size="icon" className="h-10 w-10 bg-primary hover:bg-primary/90 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "ieri";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
