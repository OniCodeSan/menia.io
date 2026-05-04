import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Radio, Calendar, Play, Square, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { liveEventsApi } from "@/lib/api";

const STATUS_LABEL = { scheduled: "Programmata", live: "Live", ended: "Conclusa", cancelled: "Annullata" };
const STATUS_TONE  = {
  scheduled: "bg-secondary/60 text-muted-foreground",
  live:      "bg-destructive/15 text-destructive border border-destructive/30",
  ended:     "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default function LiveSection({ lives = [], onEdit, onDelete, onChanged }) {
  if (lives.length === 0) {
    return (
      <section>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Live</h2>
        <div className="bg-card border border-border/30 rounded-2xl p-8 text-center">
          <Radio className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nessuna live programmata.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Live</h2>
      <div className="space-y-2">
        {lives.map((e) => (
          <LiveItem
            key={e.id}
            event={e}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e)}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}

function LiveItem({ event, onEdit, onDelete, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const isScheduled = event.status === "scheduled";
  const isLive      = event.status === "live";

  const start = async () => {
    setErr("");
    if (!window.confirm(`Avviare la live "${event.title}"? La chat-room si aprirà per gli iscritti.`)) return;
    try {
      setBusy(true);
      await liveEventsApi.start(event.id);
      onChanged?.();
      // Apri la chat-room interna nello stesso tab così il formatore vede subito i messaggi.
      navigate(`/live/${event.id}`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const end = async () => {
    if (!window.confirm(`Terminare la live "${event.title}"?`)) return;
    setErr("");
    try {
      setBusy(true);
      await liveEventsApi.end(event.id);
      onChanged?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isLive ? "bg-destructive/15" : "bg-accent/15"
        }`}>
          <Radio className={`w-5 h-5 ${isLive ? "text-destructive animate-pulse" : "text-accent"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-sm truncate">{event.title}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_TONE[event.status] || ""}`}>
              {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive mr-1 animate-pulse align-middle" />}
              {STATUS_LABEL[event.status] || event.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            {event.scheduled_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(event.scheduled_at).toLocaleString("it-IT")}
              </span>
            )}
            <span className="text-primary font-semibold">
              {Number(event.price) > 0 ? `€${Number(event.price).toFixed(2).replace(/\.00$/, "")}` : "Gratis"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isScheduled && (
            <Button
              size="sm"
              onClick={start}
              disabled={busy}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Play className="w-3.5 h-3.5 mr-1" /> Avvia live</>}
            </Button>
          )}
          {isLive && (
            <>
              <Button size="sm" onClick={() => navigate(`/live/${event.id}`)}>
                <Radio className="w-3.5 h-3.5 mr-1" /> Apri chat-room
              </Button>
              <Button size="sm" variant="outline" onClick={end} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Square className="w-3.5 h-3.5 mr-1" /> Termina</>}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} title="Modifica">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} title="Elimina">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {err && (
        <p className="text-xs text-destructive mt-2 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {err}
        </p>
      )}
    </div>
  );
}
