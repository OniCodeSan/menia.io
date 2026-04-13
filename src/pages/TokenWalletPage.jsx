import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle, Loader2, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PACKAGES = [
  { tokens: 100, price: 10, label: "Starter", color: "border-border/50", popular: false },
  { tokens: 250, price: 24, label: "Popular", color: "border-primary/60", popular: true },
  { tokens: 600, price: 54, label: "Pro", color: "border-accent/60", popular: false },
];

function TransactionRow({ tx }) {
  const isPositive = tx.amount > 0;
  const typeLabels = { topup: "Ricarica", spend: "Spesa", earn: "Guadagno", refund: "Rimborso", payout: "Payout" };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/20 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? "bg-chart-3/10" : "bg-destructive/10"}`}>
        {isPositive ? <ArrowDownLeft className="w-4 h-4 text-chart-3" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description || typeLabels[tx.type] || tx.type}</p>
        <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div className={`text-sm font-bold ${isPositive ? "text-chart-3" : "text-foreground"}`}>
        {isPositive ? "+" : ""}{tx.amount} T
      </div>
    </div>
  );
}

export default function TokenWalletPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      window.history.replaceState({}, "", "/token-wallet");
    }

    base44.auth.me().then(async (u) => {
      if (!u) { setLoading(false); return; }
      setUser(u);
      await loadWalletData(u);
    }).catch(() => setLoading(false));
  }, []);

  const loadWalletData = async (u) => {
    try {
      const [wallets, txs] = await Promise.all([
        base44.entities.TokenWallet.filter({ user_id: u.id, wallet_type: "user" }),
        base44.entities.TokenTransaction.filter({ user_id: u.id, wallet_type: "user" }),
      ]);
      setWallet(wallets?.[0] || null);
      setTransactions((txs || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (pkgIndex) => {
    if (window.self !== window.top) {
      alert("Il pagamento è disponibile solo nell'app pubblicata.");
      return;
    }
    setPurchasing(pkgIndex);
    try {
      const res = await base44.functions.invoke("tokenCheckout", { package_index: pkgIndex });
      window.location.href = res.data.url;
    } catch (e) {
      alert("Errore durante il pagamento: " + e.message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
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
        <Button className="bg-primary hover:bg-primary/90" onClick={() => base44.auth.redirectToLogin("/token-wallet")}>
          Accedi
        </Button>
      </div>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
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

      {/* Buy packages */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold">Ricarica Token</h3>
        </div>
        <div className="grid gap-3">
          {PACKAGES.map((pkg, i) => (
            <div key={i} className={`relative flex items-center justify-between p-4 rounded-xl border transition-all ${pkg.popular ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/60"}`}>
              {pkg.popular && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Più popolare
                </span>
              )}
              <div>
                <p className="font-bold text-lg">{pkg.tokens} Token</p>
                <p className="text-xs text-muted-foreground">{(pkg.price / pkg.tokens * 10).toFixed(1)}¢ per token</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-heading font-bold text-xl">€{pkg.price}</p>
                <Button
                  size="sm"
                  onClick={() => handleBuy(i)}
                  disabled={purchasing !== null}
                  className={pkg.popular ? "bg-primary hover:bg-primary/90 glow-primary" : ""}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {purchasing === i ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acquista"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">1 Token = €0.10 · Pagamento sicuro via Stripe</p>
      </motion.div>

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