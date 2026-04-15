import { useState } from "react";
import { Radio, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { walletService } from "@/lib/wallet";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_PRICE = 30;

export default function LiveAccessButton({ creatorName, liveId, price = DEFAULT_PRICE, onGranted, className = "" }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState("");

  const handleBuy = async () => {
    if (!user) { setError("Devi accedere per entrare nella live"); return; }
    if (!liveId) { setError("Live non valida"); return; }
    setError("");
    setLoading(true);
    try {
      await walletService.purchaseLiveAccess(user.id, liveId, price, `Accesso live di ${creatorName}`);
      setGranted(true);
      onGranted?.();
    } catch (e) {
      setError(/** @type {any} */ (e)?.message || "Errore durante l'acquisto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleBuy}
        disabled={loading || granted}
        className={`bg-destructive hover:bg-destructive/90 font-semibold ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : granted ? (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        ) : (
          <Radio className="w-4 h-4 mr-2" />
        )}
        {granted ? "Accesso attivo" : `Accedi alla Live — ${price} T`}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
