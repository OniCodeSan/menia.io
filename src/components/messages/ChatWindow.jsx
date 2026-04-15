import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PaidMessageBanner from "./PaidMessageBanner";

const myAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face";

const initialMessages = {
  1: [
    { id: 1, from: "them", text: "Ciao! Ho visto i tuoi contenuti e sono rimasto impressionato!", time: "10:30" },
    { id: 2, from: "me", text: "Grazie mille! Sono contenta che ti piaccia 😊", time: "10:31" },
    { id: 3, from: "them", text: "Posso avere accesso al programma completo?", time: "10:32" },
  ],
  2: [
    { id: 1, from: "them", text: "Ho iniziato il programma ieri!", time: "09:00" },
    { id: 2, from: "me", text: "Ottimo! Come stai trovando i primi allenamenti?", time: "09:05" },
    { id: 3, from: "them", text: "Grazie mille per il contenuto! 🔥", time: "09:45" },
  ],
  3: [{ id: 1, from: "them", text: "", time: "08:00", paid: true }],
  4: [
    { id: 1, from: "them", text: "Sei la mia creator preferita! 💪", time: "ieri" },
    { id: 2, from: "me", text: "Grazie, questo mi motiva tanto! 🙏", time: "ieri" },
    { id: 3, from: "them", text: "Quando pubblichi il prossimo video?", time: "14:20" },
  ],
  5: [{ id: 1, from: "them", text: "", time: "12:00", paid: true }],
  6: [
    { id: 1, from: "them", text: "Sei la mia creator preferita!", time: "ieri" },
    { id: 2, from: "me", text: "Che bella cosa! ❤️", time: "ieri" },
  ],
};

const statusColors = {
  Premium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Abbonato: "bg-primary/20 text-primary border-primary/30",
  Free: "bg-secondary text-muted-foreground border-border/30",
};

export default function ChatWindow({ conversation, onBack }) {
  const [messages, setMessages] = useState(initialMessages[conversation.id] || []);
  const [input, setInput] = useState("");
  const [unlockedPaid, setUnlockedPaid] = useState({});
  const [paidPrice, setPaidPrice] = useState("4.99");
  const [showPaidSetting, setShowPaidSetting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(initialMessages[conversation.id] || []);
    setUnlockedPaid({});
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), from: "me", text: input, time: "ora" };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden w-8 h-8 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <img
          src={conversation.avatar}
          alt={conversation.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{conversation.name}</p>
            <Badge className={`text-[10px] ${statusColors[conversation.status]}`}>
              {conversation.status}
            </Badge>
          </div>
          <p className="text-xs text-chart-3">Online</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPaidSetting(!showPaidSetting)}
            className="text-xs text-primary border border-primary/20 hover:bg-primary/10 h-7 px-2.5"
          >
            <Lock className="w-3 h-3 mr-1" />
            Imposta prezzo
          </Button>
        </div>
      </div>

      {/* Paid price setting */}
      <AnimatePresence>
        {showPaidSetting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-primary/5 border-b border-primary/20 flex items-center gap-3">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">Imposta prezzo per messaggi a pagamento (€)</p>
              <Input
                value={paidPrice}
                onChange={(e) => setPaidPrice(e.target.value)}
                className="w-20 h-7 text-xs bg-secondary/50 border-border/30 text-center"
              />
              <Button
                size="sm"
                className="h-7 text-xs bg-primary hover:bg-primary/90 px-3"
                onClick={() => setShowPaidSetting(false)}
              >
                Salva
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.map((msg) => {
          if (msg.paid && !unlockedPaid[msg.id]) {
            return (
              <PaidMessageBanner
                key={msg.id}
                sender={conversation.name}
                onUnlock={() => setUnlockedPaid((prev) => ({ ...prev, [msg.id]: true }))}
              />
            );
          }

          if (msg.paid && unlockedPaid[msg.id]) {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2 px-4"
              >
                <img src={conversation.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                <div className="bg-secondary/80 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[75%]">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-chart-4" /> Messaggio sbloccato
                  </p>
                  <p className="text-sm">Hey! Sei disponibile per una consulenza privata? 🔥</p>
                  <p className="text-[10px] text-muted-foreground text-right mt-1">{msg.time}</p>
                </div>
              </motion.div>
            );
          }

          const isMe = msg.from === "me";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 px-4 ${isMe ? "flex-row-reverse" : ""}`}
            >
              <img
                src={isMe ? myAvatar : conversation.avatar}
                alt=""
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[75%] ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary/80 rounded-bl-sm"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.time}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30 bg-card/30">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-secondary/40 border-border/30 h-10"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim()}
            size="icon"
            className="h-10 w-10 bg-primary hover:bg-primary/90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}