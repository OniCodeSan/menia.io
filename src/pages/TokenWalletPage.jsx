import { useState, useEffect } from "react";
import { Coins, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import UserWallet from "../components/wallet/UserWallet";
import { getOrderById } from "@/lib/paymentOrders";

export default function TokenWalletPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isLoadingAuth } = useAuth();
  const [returnOrder, setReturnOrder] = useState(null);
  const [walletKey, setWalletKey] = useState(0);

  const returnOrderId = params.get("order");
  useEffect(() => {
    if (!returnOrderId || !user) return;
    let cancelled = false;
    let iv = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    const poll = async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) { if (iv) clearInterval(iv); return; }
      const o = await getOrderById(returnOrderId).catch(() => null);
      if (!cancelled && o) {
        setReturnOrder(o);
        if (o.status === "succeeded" || o.status === "failed") {
          if (iv) clearInterval(iv);
          if (o.status === "succeeded") setWalletKey((k) => k + 1);
        }
      }
    };
    poll();
    iv = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [returnOrderId, user]);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Coins className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">Il tuo Wallet Token</h2>
          <p className="text-muted-foreground text-sm">Accedi per gestire i tuoi token</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/fan-login")}>
          Accedi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {returnOrderId && (
        <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${
          !returnOrder ? "bg-chart-4/10 border-chart-4/30" :
          returnOrder.status === "succeeded" ? "bg-chart-3/10 border-chart-3/30" :
          returnOrder.status === "failed" ? "bg-destructive/10 border-destructive/30" :
          "bg-chart-4/10 border-chart-4/30"
        }`}>
          {!returnOrder ? <Loader2 className="w-5 h-5 text-chart-4 shrink-0 animate-spin" /> :
           returnOrder.status === "succeeded" ? <CheckCircle2 className="w-5 h-5 text-chart-3 shrink-0" /> :
           returnOrder.status === "failed" ? <XCircle className="w-5 h-5 text-destructive shrink-0" /> :
           <Clock className="w-5 h-5 text-chart-4 shrink-0" />}
          <div>
            <p className="text-sm font-semibold">
              {!returnOrder ? "Verifica del pagamento in corso..." :
               returnOrder.status === "succeeded" ? "Pagamento confermato!" :
               returnOrder.status === "failed" ? "Pagamento non riuscito" :
               "Pagamento in elaborazione..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {returnOrder?.status === "succeeded" && returnOrder.token_amount
                ? `${returnOrder.token_amount} Token accreditati al tuo wallet`
                : returnOrder?.status === "pending"
                ? "Il tuo ordine è in attesa di conferma. I token verranno accreditati a breve."
                : !returnOrder
                ? "Stiamo verificando lo stato del pagamento..."
                : ""}
            </p>
          </div>
        </div>
      )}
      <UserWallet key={walletKey} user={user} />
    </div>
  );
}
