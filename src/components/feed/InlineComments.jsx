import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Trash2, CornerDownRight, X } from "lucide-react";
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

function buildTree(comments) {
  const map = new Map();
  const roots = [];
  comments.forEach(c => map.set(c.id, { ...c, replies: [] }));
  comments.forEach(c => {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function CommentItem({ comment, user, onDelete, onReply, depth = 0 }) {
  return (
    <div className={depth > 0 ? "ml-6 pl-3 border-l-2 border-border/20" : ""}>
      <div className="flex gap-2.5 py-1">
        {comment.user?.avatar_url ? (
          <img src={comment.user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-[10px]">
            {(comment.user?.full_name || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold">{comment.user?.full_name || "Utente"}</span>
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[13px] text-foreground/90 mt-0.5 break-words">{comment.body}</p>
          <button
            onClick={() => onReply(comment)}
            className="text-[11px] text-muted-foreground hover:text-primary mt-1 flex items-center gap-1"
          >
            <CornerDownRight className="w-3 h-3" />
            Rispondi
          </button>
        </div>
        {user?.id === comment.user_id && (
          <button onClick={() => onDelete(comment.id)} className="text-muted-foreground hover:text-destructive shrink-0 self-start mt-1">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {comment.replies?.length > 0 && (
        <div className="mt-1 space-y-1">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InlineComments({ postId, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    interactionsService.listComments(postId)
      .then(setComments)
      .catch((err) => console.warn("[InlineComments] load:", err.message))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleReply = (comment) => {
    setReplyTo(comment);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const c = await interactionsService.addComment(postId, body, replyTo?.id || null);
      setComments(prev => [...prev, c]);
      setBody("");
      setReplyTo(null);
      onCountChange?.(1);
    } catch (err) { console.warn("[InlineComments] send:", err.message); }
    setSending(false);
  };

  const handleDelete = async (id) => {
    try {
      await interactionsService.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
      onCountChange?.(-1);
    } catch (err) { console.warn("[InlineComments] delete:", err.message); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const tree = buildTree(comments);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-1 space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : tree.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nessun commento. Sii il primo!</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {tree.map(c => (
              <CommentItem
                key={c.id}
                comment={c}
                user={user}
                onDelete={handleDelete}
                onReply={handleReply}
              />
            ))}
          </div>
        )}

        {replyTo && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-secondary/40 rounded-lg text-xs">
            <CornerDownRight className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">Rispondi a</span>
            <span className="font-semibold truncate">{replyTo.user?.full_name || "Utente"}</span>
            <button onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={body}
            maxLength={2000}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!user ? "Accedi per commentare" : replyTo ? `Rispondi a ${replyTo.user?.full_name || "Utente"}...` : "Scrivi un commento..."}
            disabled={!user}
            className="flex-1 bg-secondary/50 border border-border/30 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending || !user}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
