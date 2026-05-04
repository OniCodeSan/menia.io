import { useEffect, useState } from "react";
import { Megaphone, Send, Loader2, AlertCircle, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { socialApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const TITLE_MAX = 200;
const BODY_MAX  = 5000;

export default function Broadcasts() {
  const { user } = useAuth();
  const [followerCount, setFollowerCount] = useState(null);
  const [followerErr, setFollowerErr] = useState(false);
  const [history, setHistory] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk]   = useState("");

  // Fetch indipendenti: un fallimento dei follower non deve bloccare la
  // history dei broadcast (e viceversa).
  const refresh = async () => {
    setErr("");
    socialApi.getFollowers({ limit: 1 })
      .then((r) => { setFollowerCount(r.total ?? 0); setFollowerErr(false); })
      .catch(() => { setFollowerCount(0); setFollowerErr(true); });
    socialApi.listBroadcasts({ limit: 20 })
      .then((r) => setHistory(r.broadcasts || []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { if (user) refresh(); }, [user]);

  const send = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    const t = title.trim(); const b = body.trim();
    if (t.length < 1 || t.length > TITLE_MAX) return setErr(`Titolo 1-${TITLE_MAX} caratteri`);
    if (b.length < 1 || b.length > BODY_MAX)  return setErr(`Testo 1-${BODY_MAX} caratteri`);
    setSubmitting(true);
    try {
      await socialApi.broadcast({ title: t, body: b });
      setOk(`Broadcast inviato a ${followerCount || 0} iscritt${followerCount === 1 ? "o" : "i"} (consegna in corso).`);
      setTitle(""); setBody("");
      setTimeout(refresh, 500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold leading-tight">Broadcast</h1>
          <p className="text-sm text-muted-foreground">
            Invia un messaggio a tutti i tuoi iscritti. Lo riceveranno nelle notifiche.
          </p>
        </div>
      </div>

      <form onSubmit={send} className="bg-card border border-border rounded-2xl p-5 space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {followerCount == null ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : followerErr ? (
            <span className="text-muted-foreground">Conteggio iscritti temporaneamente non disponibile.</span>
          ) : (
            <span>Invierai a <strong className="text-foreground">{followerCount}</strong> iscritt{followerCount === 1 ? "o" : "i"}</span>
          )}
        </div>

        <div>
          <Label>Titolo</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} placeholder="Es: Nuovo corso disponibile" />
          <p className="text-[11px] text-muted-foreground mt-1">{title.length}/{TITLE_MAX}</p>
        </div>

        <div>
          <Label>Testo</Label>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={BODY_MAX} placeholder="Scrivi qui il tuo annuncio..." />
          <p className="text-[11px] text-muted-foreground mt-1">{body.length}/{BODY_MAX}</p>
        </div>

        {err && <div className="text-xs text-destructive inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {err}</div>}
        {ok &&  <div className="text-xs text-chart-3 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {ok}</div>}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !title.trim() || !body.trim() || followerCount === 0}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Invia</>}
          </Button>
        </div>
        {followerCount === 0 && (
          <p className="text-xs text-muted-foreground">
            Non hai ancora iscritti. Quando qualcuno ti segue potrai inviare broadcast.
          </p>
        )}
      </form>

      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">
        Ultimi broadcast
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun broadcast inviato finora.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((b) => (
            <li key={b.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="font-heading font-bold text-sm">{b.title}</h3>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(b.created_at).toLocaleString("it-IT")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{b.body}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                <Users className="w-3 h-3 inline -mt-0.5" /> Inviato a {b.recipient_count} iscritt{b.recipient_count === 1 ? "o" : "i"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
