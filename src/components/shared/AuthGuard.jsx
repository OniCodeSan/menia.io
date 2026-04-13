import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AuthGuard({ children, allowedRoles }) {
  const [status, setStatus] = useState("loading"); // loading | ok | unauthorized | forbidden
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (!user) {
        setStatus("unauthorized");
        return;
      }
      setUserRole(user.role);
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        setStatus("forbidden");
        return;
      }
      setStatus("ok");
    }).catch(() => setStatus("unauthorized"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-4xl">🔒</span>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">Accesso richiesto</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Devi effettuare il login per accedere a questa sezione.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 glow-primary"
          onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
        >
          Accedi ora
        </Button>
      </div>
    );
  }

  if (status === "forbidden") {
    // Creator trying to access fan area
    const isCreatorInFanArea = (userRole === 'creator' || userRole === 'admin') && allowedRoles?.includes('user');
    // Fan trying to access creator area
    const isFanInCreatorArea = (userRole === 'user' || userRole === 'fan') && allowedRoles?.includes('creator');

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <span className="text-4xl">🚫</span>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">Area non accessibile</h2>
          {isCreatorInFanArea ? (
            <p className="text-muted-foreground text-sm max-w-xs">Sei loggato come Creator. Vai alla tua dashboard.</p>
          ) : isFanInCreatorArea ? (
            <p className="text-muted-foreground text-sm max-w-xs">Sei loggato come Fan. Questa sezione è riservata ai Creator.</p>
          ) : (
            <p className="text-muted-foreground text-sm max-w-xs">Non hai i permessi per accedere a questa sezione.</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {isCreatorInFanArea ? (
            <Link to="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 glow-primary">Vai alla Dashboard Creator</Button>
            </Link>
          ) : isFanInCreatorArea ? (
            <>
              <Link to="/creator-onboarding">
                <Button className="bg-primary hover:bg-primary/90 glow-primary">Diventa Creator</Button>
              </Link>
              <Link to="/fan-dashboard">
                <Button variant="outline" className="border-border/50">La mia area fan</Button>
              </Link>
            </>
          ) : (
            <Link to="/explore">
              <Button variant="outline" className="border-border/50">Esplora contenuti</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return children;
}