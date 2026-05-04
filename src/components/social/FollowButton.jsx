import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { socialApi } from "@/lib/api";

export default function FollowButton({ creatorId, className = "" }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isSelf = user?.id === creatorId;

  useEffect(() => {
    if (!user || isSelf) { setLoading(false); return; }
    let cancelled = false;
    socialApi.followStatus(creatorId)
      .then((r) => { if (!cancelled) setFollowing(!!r.following); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [creatorId, user, isSelf]);

  if (isSelf) return null;
  if (!user) {
    return (
      <a href="/student-login" className={className}>
        <Button size="sm" variant="outline">
          <UserPlus className="w-4 h-4 mr-1.5" /> Segui
        </Button>
      </a>
    );
  }

  const toggle = async () => {
    if (busy) return;
    const prev = following;
    const next = !prev;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) await socialApi.follow(creatorId);
      else      await socialApi.unfollow(creatorId);
    } catch (e) {
      setFollowing(prev);
      console.warn("[follow]", e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Button size="sm" variant="outline" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button size="sm" variant={following ? "outline" : "default"} onClick={toggle} disabled={busy} className={className}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" />
        : following ? <><UserCheck className="w-4 h-4 mr-1.5" /> Segui già</>
        : <><UserPlus className="w-4 h-4 mr-1.5" /> Segui</>}
    </Button>
  );
}
