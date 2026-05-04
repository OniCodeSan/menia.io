import { useEffect, useState } from "react";
import { BellOff, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { preferencesApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function MuteButton({ creatorId, className = "" }) {
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    preferencesApi.get()
      .then((r) => {
        if (cancelled) return;
        const found = (r.preferences || []).some(
          (p) => p.creator_id === creatorId && p.type === "broadcast" && p.muted
        );
        setMuted(found);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, creatorId]);

  if (!user) return null;
  if (loading) {
    return (
      <Button size="sm" variant="ghost" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  const toggle = async () => {
    if (busy) return;
    const prev = muted;
    setMuted(!prev);
    setBusy(true);
    try {
      if (prev) await preferencesApi.unmute(creatorId);
      else      await preferencesApi.mute(creatorId);
    } catch (e) {
      setMuted(prev);
      console.warn("[mute]", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="ghost" onClick={toggle} disabled={busy} className={className}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" />
       : muted ? <><BellOff className="w-4 h-4 mr-1.5" /> Silenziato</>
       : <><Bell className="w-4 h-4 mr-1.5" /> Silenzia</>}
    </Button>
  );
}
