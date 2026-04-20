import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat2, AtSign, Check, Loader2, Search, X } from "lucide-react";
import { reshareService, notificationsService } from "@/lib/notifications";
import { supabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function ShareMenu({ post, open, onClose, onReshared }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [resharing, setResharing] = useState(false);
  const [reshared, setReshared] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tagged, setTagged] = useState(null);
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) { setMode(null); setReshared(false); setTagged(null); setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (mode === "tag") setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  useEffect(() => {
    if (!query.trim() || query.length < 2 || !hasSupabase) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, handle, avatar_url")
        .or(`handle.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq("id", user?.id || "")
        .limit(8);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, user?.id]);

  const handleReshare = async () => {
    if (!user || resharing) return;
    setResharing(true);
    try {
      await reshareService.reshare(post.id);
      setReshared(true);
      onReshared?.();
      setTimeout(() => onClose?.(), 1200);
    } catch {}
    setResharing(false);
  };

  const handleTag = async (targetUser) => {
    if (!user || sending) return;
    setSending(true);
    try {
      const creator = post.creator || {};
      await notificationsService.send({
        userId: targetUser.id,
        type: "tag",
        title: `${user.full_name || "Qualcuno"} ti ha taggato`,
        body: `Ti ha inviato il post "${post.title}" di ${creator.full_name || "un creator"}`,
        refId: `post:${post.id}`,
      });
      setTagged(targetUser);
      setTimeout(() => onClose?.(), 1500);
    } catch {}
    setSending(false);
  };

  if (!open) return null;

  return (
    <div ref={ref} className="absolute left-0 top-full mt-2 z-50">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-72 bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden"
      >
        {!mode && (
          <div className="p-1.5">
            <button
              onClick={() => user ? handleReshare() : null}
              disabled={!user}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-sm disabled:opacity-40"
            >
              {resharing ? <Loader2 className="w-4 h-4 animate-spin" /> : reshared ? <Check className="w-4 h-4 text-chart-3" /> : <Repeat2 className="w-4 h-4 text-muted-foreground" />}
              <span className={reshared ? "text-chart-3 font-semibold" : ""}>{reshared ? "Ricondiviso!" : "Ricondividi sul tuo profilo"}</span>
            </button>
            <button
              onClick={() => user ? setMode("tag") : null}
              disabled={!user}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-sm disabled:opacity-40"
            >
              <AtSign className="w-4 h-4 text-muted-foreground" />
              Tagga un utente
            </button>
          </div>
        )}

        {mode === "tag" && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
              <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca utente..."
                  className="w-full bg-secondary/50 border border-border/30 rounded-full pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {tagged ? (
                <div className="flex items-center gap-2 px-4 py-4 text-sm text-chart-3 font-semibold justify-center">
                  <Check className="w-4 h-4" />
                  Inviato a @{tagged.handle || tagged.full_name}!
                </div>
              ) : searching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 && query.length >= 2 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nessun utente trovato</p>
              ) : (
                results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleTag(u)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {(u.full_name || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.full_name}</p>
                      {u.handle && <p className="text-[11px] text-muted-foreground">@{u.handle}</p>}
                    </div>
                  </button>
                ))
              )}
              {query.length < 2 && !tagged && (
                <p className="text-xs text-muted-foreground text-center py-4">Digita almeno 2 caratteri</p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
