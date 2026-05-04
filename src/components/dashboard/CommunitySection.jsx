import { useEffect, useState } from "react";
import { MessageCircle, Users, Lock, ChevronDown, ChevronUp, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { communityApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Metric from "./Metric";

export default function CommunitySection({ stats }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refresh = () => {
    if (!user?.id) return;
    supabase
      .from("community_posts")
      .select("id, title, body, created_at, is_subscribers_only")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setPosts(data || []));
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("community_posts")
      .select("id, title, body, created_at, is_subscribers_only")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (!cancelled) setPosts(data || []); });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Community</h2>
        <div className="bg-card border border-border/30 rounded-2xl p-5 grid grid-cols-2 gap-4">
          <Metric label="Post" value={stats.posts} icon={MessageCircle} />
          <Metric label="Iscritti attivi" value={stats.subscribers} icon={Users} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground">Ultimi post</h3>
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nuovo post
          </Button>
        </div>
        {posts === null ? (
          <div className="bg-card border border-border/30 rounded-2xl p-4 h-20 animate-pulse" />
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-2xl p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p>Non hai ancora pubblicato post community.</p>
            <p className="text-xs mt-1">Pubblica aggiornamenti, riflessioni o materiali extra. I post "solo iscritti" sono visibili agli studenti del tuo abbonamento community.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => <PostRow key={p.id} post={p} onDeleted={refresh} />)}
          </div>
        )}
      </div>

      {editorOpen && (
        <PostEditor
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); refresh(); }}
        />
      )}
    </section>
  );
}

function PostRow({ post: p, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasBody = !!(p.body && p.body.trim());

  const onDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Eliminare il post "${p.title || "(senza titolo)"}"? L'azione non è reversibile.`)) return;
    setDeleting(true);
    try {
      await communityApi.remove(p.id);
      onDeleted?.();
    } catch (err) {
      alert(err.message || "Errore eliminazione post");
      setDeleting(false);
    }
  };

  return (
    <article className="bg-card border border-border/30 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => hasBody && setOpen((v) => !v)}
          className={`flex-1 text-left min-w-0 ${hasBody ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-heading font-bold text-sm truncate">{p.title || "(senza titolo)"}</h4>
            <span className="text-[10px] text-muted-foreground shrink-0 inline-flex items-center gap-1">
              {new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
              {hasBody && (open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </span>
          </div>
          {p.body && (
            <p className={`text-xs text-muted-foreground mt-1 ${open ? "whitespace-pre-line" : "line-clamp-2"}`}>{p.body}</p>
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 -mt-0.5 -mr-1"
          title="Elimina post"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
      {p.is_subscribers_only && (
        <p className="mt-2 text-[10px] text-primary inline-flex items-center gap-1">
          <Lock className="w-3 h-3" /> Solo iscritti
        </p>
      )}
    </article>
  );
}

function PostEditor({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subsOnly, setSubsOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) { setErr("Inserisci almeno un titolo o un testo."); return; }
    if (t.length > 200) { setErr("Titolo troppo lungo (max 200)."); return; }
    if (b.length > 10000) { setErr("Testo troppo lungo (max 10.000)."); return; }
    setSaving(true);
    try {
      await communityApi.create({
        title: t || null,
        body: b || null,
        is_subscribers_only: subsOnly,
      });
      onSaved?.();
    } catch (e) {
      setErr(e.message || "Errore pubblicazione post");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-lg mb-4">Nuovo post community</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="post-title" className="text-xs">Titolo</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Aggiornamento del corso, nuovo materiale extra..."
              maxLength={200}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{title.length}/200</p>
          </div>
          <div>
            <Label htmlFor="post-body" className="text-xs">Testo</Label>
            <Textarea
              id="post-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Scrivi qui il contenuto del post..."
              maxLength={10000}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{body.length}/10000</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={subsOnly} onChange={(e) => setSubsOnly(e.target.checked)} />
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" /> Solo iscritti all'abbonamento community
            </span>
          </label>
          {err && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Annulla</Button>
          <Button onClick={save} className="flex-1" disabled={saving || (!title.trim() && !body.trim())}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pubblica post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
