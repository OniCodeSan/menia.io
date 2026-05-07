import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const ALLOWED_DOMAINS = (import.meta.env.VITE_ADMIN_ALLOWED_DOMAINS || "menia.io").split(",").map((s) => s.trim()).filter(Boolean);
const ALLOWED_EMAILS = (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS || "cotugnomariano@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

function isEmailAllowed(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  if (ALLOWED_EMAILS.includes(e)) return true;
  return ALLOWED_DOMAINS.some((d) => e.endsWith(`@${d}`));
}

export default function AdminLogin() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (user && user.role === "admin") navigate("/", { replace: true });
  }, [isLoadingAuth, user, navigate]);

  async function onPassword(e) {
    e.preventDefault();
    if (!isEmailAllowed(email)) {
      setErr("Questa email non è autorizzata per Odino.");
      return;
    }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    navigate("/", { replace: true });
  }

  async function onGoogle() {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: ALLOWED_DOMAINS.length === 1 ? { hd: ALLOWED_DOMAINS[0] } : undefined,
      },
    });
    if (error) { setErr(error.message); setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm bg-card border border-border/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-heading text-xl font-bold leading-tight">Odino</h1>
            <p className="text-xs text-muted-foreground">Menia control center</p>
          </div>
        </div>

        <form onSubmit={onPassword} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required disabled={busy} />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required disabled={busy} />
          </div>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entra"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border/40" /> oppure <div className="flex-1 h-px bg-border/40" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
          Accedi con Google
        </Button>

        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          Solo email autorizzate. Tutti gli accessi sono loggati.
        </p>
      </div>
    </div>
  );
}
