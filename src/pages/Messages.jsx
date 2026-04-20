import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import AuthGuard from "../components/shared/AuthGuard";
import { MessageCircle } from "lucide-react";
import ConversationList from "../components/messages/ConversationList";
import ChatWindow from "../components/messages/ChatWindow";

export default function Messages() {
  const location = useLocation();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (location.state?.openConversation && !selected) {
      setSelected(location.state.openConversation);
    }
  }, [location.state]);

  return (
    <AuthGuard>
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sidebar — always visible on md+, hidden on mobile when chat open */}
      <div className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-col border-r border-border/30 bg-card/20`}>
        <ConversationList selectedId={selected?.id} onSelect={setSelected} />
      </div>

      {/* Chat area */}
      <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col h-full"
            >
              <ChatWindow
                conversation={selected}
                onBack={() => setSelected(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-primary/50" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg mb-1">Nessuna chat selezionata</h3>
                <p className="text-sm text-muted-foreground">Seleziona una conversazione per iniziare</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </AuthGuard>
  );
}