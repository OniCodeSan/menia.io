import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, TrendingUp, ArrowUpRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { walletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAYOUT_RATE = 0.10;
const MIN_PAYOUT_EUR = 50;

function TransactionRow({ tx }) {
  const isPositive = tx.amount > 0;
  const typeLabels = { earn: "Guadagno", payout: "Payout", refund: "Rimborso" };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/20 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? "bg-chart-3/10" : "bg-primary/10"}`}>
        {isPositive ? <TrendingUp className="w-4 h-4 text-chart-3" /> : <ArrowUpRight className="w-4 h-4 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description || typeLabels[tx.type] || tx.type}</p>
        <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <span className={`text-sm font-bold ${isPositive ? "text-chart-3" : "text-muted-foreground"}`}>
        {isPositive ? "+" : ""}{tx.amount} T
      </span>
    </div>
  );
}

export default function CreatorWallet({ user }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [w, txs, payouts] = await Promise.all([
        walletService.getCreatorWallet(user.id),
        walletService.listTransactions(user.id, "creator"),
        walletService.listPayouts(user.id),
      ]);
      setWallet(w);
      setTransactions(txs || []);
      setPayoutRequests(payouts || []);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    const tokens = parseInt(payoutAmount, 10);
    if (!tokens || isNaN(tokens)) return;
    setRequesting(true);
    setPayoutResult(null);
    try {
      const res = await walletService.requestPayout(user.id, tokens);
      setPayoutResult({ success: true, euro: res.euro_amount });
      setPayoutAmount("");
      await loadData();
    } catch (e) {
      setPayoutResult({ success: false, error: e.message });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const balance = wallet?.balance || 0;
  const euroValue = parseFloat((balance * PAYOUT_RATE).toFixed(2));
  const minTokensForPayout = Math.ceil(MIN_PAYOUT_EUR / PAYOUT_RATE);
  const estimatedEuro = payoutAmount ? parseFloat((parseInt(payoutAmount, 10) * PAYOUT_RATE).toFixed(2)) : 0;

  const statusColors = { pending: "text-chart-4", approved: "text-chart-3", paid: "text-chart-3", rejected: "text-destructive" };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Balance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-chart-3/10 to-primary/10 border border-chart-3/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-chart-3/20 flex items-center justify-center">
            <Coins className="w-6 h-6 text-chart-3" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Creator</p>
            <p className="font-heading text-3xl font-bold">{balance.toLocaleString()} <span className="text-lg text-muted-foreground font-normal">Token</span></p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t border-border/20">
          <div>
            <p className="text-xs text-muted-foreground">Valore stimato</p>
            <p className="font-bold text-chart-3">€{euroValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Totale guadagnato</p>
            <p className="font-bold">{wallet?.total_earned || 0} T</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Totale pagato</p>
            <p className="font-bold">{wallet?.total_spent || 0} T</p>
          </div>
        </div>
      </motion.div>

      {/* Payout request */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <h3 className="font-heading font-bold">Richiedi Payout</h3>
        <p className="text-xs text-muted-foreground">Minimo €{MIN_PAYOUT_EUR} ({minTokensForPayout} token) · Tasso di conversione: 1 Token = €{PAYOUT_RATE}</p>

        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Token da convertire</Label>
            <Input
              type="number"
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              placeholder={`Min. ${minTokensForPayout}`}
              className="bg-secondary/30 border-border/30 h-10"
            />
          </div>
          <div className="text-center px-3">
            <p className="text-xs text-muted-foreground mb-1">Ricevi</p>
            <p className="font-heading font-bold text-chart-3">€{estimatedEuro.toFixed(2)}</p>
          </div>
          <Button onClick={handlePayout} disabled={requesting || !payoutAmount} className="bg-primary hover:bg-primary/90">
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Richiedi"}
          </Button>
        </div>

        {payoutResult && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${payoutResult.success ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}`}>
            {payoutResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {payoutResult.success ? `Richiesta inviata! Riceverai €${payoutResult.euro} appena approvata.` : payoutResult.error}
          </div>
        )}
      </motion.div>

      {/* Payout history */}
      {payoutRequests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card/50 border border-border/30 rounded-2xl p-5">
          <h3 className="font-heading font-bold mb-4">Storico Payout</h3>
          <div className="space-y-2">
            {payoutRequests.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.token_amount} Token → €{p.euro_amount}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at || p.created_date).toLocaleDateString("it-IT")}</p>
                </div>
                <span className={`text-xs font-semibold capitalize ${statusColors[p.status]}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-5">
        <h3 className="font-heading font-bold mb-4">Storico Guadagni</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessuna transazione ancora</p>
        ) : (
          <div>{transactions.slice(0, 20).map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
        )}
      </motion.div>
    </div>
  );
}