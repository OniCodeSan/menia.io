import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Plus, ArrowDownLeft, ArrowUpRight, Loader2, Zap, CreditCard, CheckCircle2, Lock } from "lucide-react";
import { walletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const PACKAGES = [
  { tokens: 100, price: 10, label: "Starter", popular: false },
  { tokens: 250, price: 24, label: "Popular", popular: true },
  { tokens: 600, price: 54, label: "Pro", popular: false },
];

function TransactionRow({ tx }) {
  const isPositive = tx.amount > 0;
  const typeLabels = { topup: "Ricarica", spend: "Spesa", earn: "Guadagno", refund: "Rimborso", payout: "Payout" };
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

const emptyCard = { name: "", number: "", expiry: "", cvc: "" };

export default function UserWallet({ user }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [paymentStep, setPaymentStep] = useState("form");
  const [card, setCard] = useState(emptyCard);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("token_success")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [w, txs] = await Promise.all([
        walletService.getUserWallet(user.id),
        walletService.listTransactions(user.id),
      ]);
      setWallet(w);
      setTransactions(txs || []);
    } catch (e) {
      console.warn("[wallet] loadData", e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = (pkgIndex) => {
    setSelectedPkg(PACKAGES[pkgIndex]);
    setCard(emptyCard);
    setPaymentError("");
    setPaymentStep("form");
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (paymentStep === "processing") return;
    setCheckoutOpen(false);
    setTimeout(() => {
      setSelectedPkg(null);
      setCard(emptyCard);
      setPaymentError("");
      setPaymentStep("form");
    }, 200);
  };

  const formatCardNumber = (v) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const validateCard = () => {
    if (!card.name.trim()) return "Inserisci il nome del titolare";
    const digits = card.number.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 16) return "Numero carta non valido";
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Scadenza non valida (MM/AA)";
    const [mm, yy] = card.expiry.split("/").map((n) => parseInt(n, 10));
    if (mm < 1 || mm > 12) return "Mese scadenza non valido";
    const now = new Date();
    const exp = new Date(2000 + yy, mm - 1, 1);
    if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) return "Carta scaduta";
    if (!/^\d{3,4}$/.test(card.cvc)) return "CVC non valido";
    return null;
  };

  const handleConfirmPayment = async () => {
    const err = validateCard();
    if (err) {
      setPaymentError(err);
      return;
    }
    setPaymentError("");
    setPaymentStep("processing");
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await walletService.topUp(user.id, selectedPkg.tokens, `Acquisto ${selectedPkg.label}`);
      await loadData();
      setPaymentStep("success");
      setTimeout(() => closeCheckout(), 1800);
    } catch (e) {
      setPaymentError(e.message || "Errore durante il pagamento");
      setPaymentStep("form");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const balance = wallet?.balance || 0;

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
                <p className="text-xs text-muted-foreground">{pkg.label}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-heading font-bold text-xl">€{pkg.price}</p>
                <Button
                  size="sm"
                  onClick={() => openCheckout(i)}
                  className={pkg.popular ? "bg-primary hover:bg-primary/90 glow-primary" : ""}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  Acquista
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

      <Dialog open={checkoutOpen} onOpenChange={(v) => (v ? setCheckoutOpen(true) : closeCheckout())}>
        <DialogContent className="sm:max-w-md">
          {paymentStep === "success" ? (
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-chart-3/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-chart-3" />
              </div>
              <DialogTitle className="font-heading">Pagamento completato</DialogTitle>
              <DialogDescription>
                {selectedPkg?.tokens} Token sono stati aggiunti al tuo saldo.
              </DialogDescription>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Completa l'acquisto
                </DialogTitle>
                <DialogDescription>
                  Inserisci i dati della carta per confermare il pagamento.
                </DialogDescription>
              </DialogHeader>

              {selectedPkg && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
                  <div>
                    <p className="font-bold text-lg">{selectedPkg.tokens} Token</p>
                    <p className="text-xs text-muted-foreground">{selectedPkg.label}</p>
                  </div>
                  <p className="font-heading font-bold text-2xl">€{selectedPkg.price}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-name">Nome titolare</Label>
                  <Input
                    id="cc-name"
                    placeholder="Mario Rossi"
                    value={card.name}
                    disabled={paymentStep === "processing"}
                    onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-number">Numero carta</Label>
                  <Input
                    id="cc-number"
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    value={card.number}
                    disabled={paymentStep === "processing"}
                    onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cc-exp">Scadenza</Label>
                    <Input
                      id="cc-exp"
                      placeholder="MM/AA"
                      inputMode="numeric"
                      value={card.expiry}
                      disabled={paymentStep === "processing"}
                      onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cc-cvc">CVC</Label>
                    <Input
                      id="cc-cvc"
                      placeholder="123"
                      inputMode="numeric"
                      maxLength={4}
                      value={card.cvc}
                      disabled={paymentStep === "processing"}
                      onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    />
                  </div>
                </div>
                {paymentError && (
                  <p className="text-xs text-destructive">{paymentError}</p>
                )}
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Pagamento simulato in ambiente di test — nessun addebito reale.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeCheckout} disabled={paymentStep === "processing"}>
                  Annulla
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={paymentStep === "processing"}
                  className="bg-primary hover:bg-primary/90 glow-primary"
                >
                  {paymentStep === "processing" ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Elaborazione...</>
                  ) : (
                    <>Paga €{selectedPkg?.price}</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}