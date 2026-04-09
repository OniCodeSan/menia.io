import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Crown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MOCK_MESSAGES = [
  { id: 1, user: "Giovanni", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&fit=crop&crop=face", text: "Sei fortissima! 🔥", type: "normal", isPremium: true },
  { id: 2, user: "Alessia", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&fit=crop&crop=face", text: "Aspettavo questo live da settimane!", type: "normal", isPremium: false },
  { id: 3, user: "Davide", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&fit=crop&crop=face", text: "💰 Ha donato €20!", type: "donation", amount: 20, isPremium: false },
  { id: 4, user: "Chiara", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&fit=crop&crop=face", text: "Puoi spiegare di nuovo il secondo esercizio?", type: "normal", isPremium: true },
  { id: 5, user: "Marco", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&fit=crop&crop=face", text: "💰 Ha donato €50!", type: "donation", amount: 50, isPremium: true },
  { id: 6, user: "Laura", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&fit=crop&crop=face", text: "Finalmente! ❤️", type: "normal", isPremium: false },
  { id: 7, user: "Matteo", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60&fit=crop&crop=face", text: "Si può fare replay dopo?", type: "normal", isPremium: false },
];

const AUTO_MESSAGES = [
  { user: "Fan34", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&fit=crop&crop=face", text: "Wow che energia! 💪", type: "normal", isPremium: false },
  { user: "Giulia", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&fit=crop&crop=face", text: "💰 Ha donato €10!", type: "donation", amount: 10 },
  { user: "AndreaR", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=60&fit=crop&crop=face", text: "Mi sono appena abbonato! 🎉", type: "sub" },
  { user: "Luca99", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60&fit=crop&crop=face", text: "Top creator della piattaforma 👑", type: "normal", isPremium: true },
  { user: "Sofia", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&fit=crop&crop=face", text: "💰 Ha donato €30!", type: "donation", amount: 30 },
];

export default function LiveChat({ onNewDonation }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const counterRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const msg = AUTO_MESSAGES[counterRef.current % AUTO_MESSAGES.length];
      const newMsg = { ...msg, id: Date.now() };
      setMessages((prev) => [...prev.slice(-30), newMsg]);
      if (newMsg.type === "donation" && onNewDonation) onNewDonation(newMsg);
      counterRef.current++;
    }, 3500);
    return () => clearInterval(interval);
  }, [onNewDonation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "Tu", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&fit=crop&crop=face", text: input, type: "normal", isPremium: true, isMe: true },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-none">
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
                  <img src={msg.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs font-semibold text-chart-4">{msg.user}</span>
                  <span className="text-xs text-muted-foreground flex-1">ha donato</span>
                  <span className="text-xs font-bold text-chart-4">€{msg.amount}</span>
                </div>
              ) : msg.type === "sub" ? (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                  <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                  <img src={msg.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs font-semibold text-primary">{msg.user}</span>
                  <span className="text-xs text-muted-foreground">{msg.text}</span>
                </div>
              ) : (
                <div className={`flex items-start gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}>
                  <img src={msg.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className={`max-w-[85%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {msg.isPremium && !msg.isMe && <Crown className="w-3 h-3 text-chart-4" />}
                      <span className="text-[11px] font-semibold text-muted-foreground">{msg.user}</span>
                    </div>
                    <div className={`rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${msg.isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary/60 rounded-bl-sm"}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-3 border-t border-border/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Scrivi nella chat..."
            className="flex-1 bg-secondary/40 border-border/30 h-9 text-sm"
          />
          <Button onClick={send} disabled={!input.trim()} size="icon" className="w-9 h-9 bg-primary hover:bg-primary/90 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}