import { useEffect, useState } from "react";
import { MessageCircle, Users, Lock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Metric from "./Metric";

export default function CommunitySection({ stats }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);

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
        <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">Ultimi post</h3>
        {posts === null ? (
          <div className="bg-card border border-border/30 rounded-2xl p-4 h-20 animate-pulse" />
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-2xl p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p>Non hai ancora pubblicato post community.</p>
            <p className="text-xs mt-1">La pubblicazione di nuovi post sarà disponibile a breve. Per ora i tuoi iscritti riceveranno gli aggiornamenti via Broadcast.</p>
            <Link to="/dashboard/broadcasts" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
              Vai ai broadcast <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function PostRow({ post: p }) {
  const [open, setOpen] = useState(false);
  const hasBody = !!(p.body && p.body.trim());
  return (
    <article className="bg-card border border-border/30 rounded-2xl p-4">
      <button
        type="button"
        onClick={() => hasBody && setOpen((v) => !v)}
        className={`w-full text-left ${hasBody ? "cursor-pointer" : "cursor-default"}`}
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
      {p.is_subscribers_only && (
        <p className="mt-2 text-[10px] text-primary inline-flex items-center gap-1">
          <Lock className="w-3 h-3" /> Solo iscritti
        </p>
      )}
    </article>
  );
}
