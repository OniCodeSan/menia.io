import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2, Clock, XCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { walletService } from "@/lib/wallet";
import { TOKEN_PACKS } from "@/lib/plans";
import { createTokenPurchaseIntent, listUserOrders, startCheckout } from "@/lib/paymentOrders";

function TransactionRow({ tx }) {
  const isPositive = tx.amount > 0;
  const typeLabels = { topup: "Ricarica", spend: "Spesa", earn: "Guadagno", earning: "Guadagno", refund: "Rimborso", payout: "Payout" };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/20 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-chart-3/10" : "bg-destructive/10"}`}>
        {isPositive ? <ArrowDownLeft className="w-4 h-4 text-chart-3" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description || typeLabels[tx.type] || tx.type}</p>
        <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div className={`text-sm font-bold shrink-0 ${isPositive ? "text-chart-3" : "text-foreground"}`}>
        {isPositive ? "+" : ""}{tx.amount} T
      </div>
    </div>
  );
}

const STATUS_ICON = {
  pending: Clock,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
};
const STATUS_STYLE = {
  pending: "text-chart-4 bg-chart-4/10 border-chart-4/30",
  succeeded: "text-chart-3 bg-chart-3/10 border-chart-3/30",
  failed: "text-destructive bg-destructive/10 border-destructive/30",
  cancelled: "text-muted-foreground bg-secondary/40 border-border/30",
};
const STATUS_LABEL = { pending: "In attesa", succeeded: "Completato", failed: "Fallito", cancelled: "Annullato" };

export default function UserWallet({ user }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [buyResult, setBuyResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [w, txs, ords] = await Promise.all([
        walletService.getUserWallet(user.id),
        walletService.listTransactions(user.id),
        listUserOrders(user.id).catch(() => []),
      ]);
      setWallet(w);
      setTransactions(txs || []);
      setOrders(ords);
    } catch (e) {
      console.warn("[wallet] loadData", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPack = async (pack) => {
    const code = `pack_${pack.tokens}`;
    setBuying(code);
    setBuyResult(null);
    try {
      const order = await createTokenPurchaseIntent(user.id, code);
      try {
        const { checkoutUrl } = await startCheckout(order.id);
        window.location.href = checkoutUrl;
        return;
      } catch (gwErr) {
        console.warn("[wallet] gateway not available, order stays pending:", gwErr.message);
        setBuyResult({ code, ok: false, error: "Gateway di pagamento non disponibile. L'ordine è stato creato e potrai completarlo in seguito." });
        loadData();
      }
    } catch (e) {
      setBuyResult({ code, ok: false, error: e.message });
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const balance = wallet?.balance || 0;
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const recentOrders = orders.filter((o) => o.status !== "pending").slice(0, 5);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Balance card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Saldo Token</p>
            <p className="font-heading text-3xl font-bold">{balance.toLocaleString()} <span className="text-lg text-muted-foreground font-normal">Token</span></p>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Totale ricaricato: <span className="text-foreground font-medium">{wallet?.total_earned || 0} T</span></span>
          <span>Totale speso: <span className="text-foreground font-medium">{wallet?.total_spent || 0} T</span></span>
        </div>
      </motion.div>

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-chart-4/5 border border-chart-4/30 rounded-2xl p-5 space-y-3">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-chart-4" />
            Acquisti in attesa di conferma
          </h3>
          {pendingOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b border-border/20 last:border-0">
              <div>
                <p className="font-medium">
                  {o.order_type === "token_pack" ? `${o.token_amount} Token` : `Piano ${o.target_code}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-chart-4 font-semibold">€{Number(o.amount_eur).toFixed(2)}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Token packs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <h3 className="font-heading font-bold">Acquista Token</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOKEN_PACKS.map((pack) => {
            const code = `pack_${pack.tokens}`;
            const isBuying = buying === code;
            const result = buyResult?.code === code ? buyResult : null;
            return (
              <button
                key={pack.tokens}
                onClick={() => handleBuyPack(pack)}
                disabled={!!buying}
                className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-secondary/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
              >
                <div>
                  <p className="font-bold">{pack.tokens} Token</p>
                  <p className="text-xs text-muted-foreground">
                    {(pack.eur / pack.tokens * 100).toFixed(1)} cent/T
                  </p>
                </div>
                <div className="text-right">
                  {isBuying ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : result?.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-chart-3" />
                  ) : (
                    <p className="font-heading font-bold text-lg">€{pack.eur}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {buyResult?.ok && (
          <p className="text-xs text-chart-3 text-center font-medium">
            Ordine creato! Riceverai i token dopo la conferma del pagamento.
          </p>
        )}
        {buyResult && !buyResult.ok && (
          <p className="text-xs text-destructive text-center">{buyResult.error}</p>
        )}
      </motion.div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card/50 border border-border/30 rounded-2xl p-5">
          <h3 className="font-heading font-bold mb-4">Ordini recenti</h3>
          {recentOrders.map((o) => {
            const Icon = STATUS_ICON[o.status] || Clock;
            return (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
                <Icon className={`w-4 h-4 shrink-0 ${STATUS_STYLE[o.status]?.split(" ")[0] || "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {o.order_type === "token_pack" ? `${o.token_amount} Token` : `Piano ${o.target_code}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">€{Number(o.amount_eur).toFixed(2)}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[o.status] || ""}`}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Transaction history */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-5">
        <h3 className="font-heading font-bold mb-4">Storico Transazioni</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessuna transazione ancora</p>
        ) : (
          <div>{transactions.slice(0, 20).map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</div>
        )}
      </motion.div>
    </div>
  );
}
