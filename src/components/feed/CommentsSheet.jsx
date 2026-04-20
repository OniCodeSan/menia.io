import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import { interactionsService } from "@/lib/interactions";
import { useAuth } from "@/lib/AuthContext";

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}g`;
};

export default function CommentsSheet({ postId, open, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    interactionsService.listComments(postId)
      .then(setComments)
      .catch((err) => console.warn("[CommentsSheet] load:", err.message))
      .finally(() => setLoading(false));
  }, [open, postId]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const c = await interactionsService.addComment(postId, body);
      setComments(prev => [...prev, c]);
      setBody("");
      onCountChange?.(1);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch (err) { console.warn("[CommentsSheet] send:", err.message); }
    setSending(false);
  };

  const handleDelete = async (id) => {
    try {
      await interactionsService.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
      onCountChange?.(-1);
    } catch (err) { console.warn("[CommentsSheet] delete:", err.message); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl border-t border-border/30 flex flex-col"
            style={{ maxHeight: "70dvh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <h3 className="font-heading font-bold text-sm">Commenti ({comments.length})</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nessun commento. Sii il primo!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    {c.user?.avatar_url ? (
                      <img src={c.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                        {(c.user?.full_name || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold">{c.user?.full_name || "Utente"}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-0.5 break-words">{c.body}</p>
                    </div>
                    {user?.id === c.user_id && (
                      <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive shrink-0 self-start mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/20 flex gap-2">
              <input
                ref={inputRef}
                value={body}
                maxLength={2000}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={user ? "Scrivi un commento..." : "Accedi per commentare"}
                disabled={!user}
                className="flex-1 bg-secondary/50 border border-border/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!body.trim() || sending || !user}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
