import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

const PRESET_AMOUNTS = [2, 5, 10, 20];

export default function DonationModal({ creatorName, onClose }) {
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? parseFloat(custom) : amount;

  const handleDonate = async () => {
    if (window.self !== window.top) {
      alert("I pagamenti funzionano solo dall'app pubblicata, non dall'anteprima.");
      return;
    }
    if (!finalAmount || finalAmount < 1) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        type: "donation",
        amount: finalAmount,
        creatorName,
        successUrl: window.location.origin + window.location.pathname + "?donation=success",
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md bg-card border border-border/40 rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-chart-5" />
            <h3 className="font-heading font-bold text-lg">Dona a {creatorName}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">Scegli un importo o inseriscine uno personalizzato</p>

        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => { setAmount(a); setCustom(""); }}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                amount === a && !custom
                  ? "border-chart-5/60 bg-chart-5/10 text-chart-5"
                  : "border-border/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              €{a}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Importo personalizzato (€)</label>
          <Input
            type="number"
            min="1"
            placeholder="Es. 15"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>

        <Button
          onClick={handleDonate}
          disabled={loading || !finalAmount || finalAmount < 1}
          className="w-full h-11 bg-chart-5 hover:bg-chart-5/90 font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
          Dona €{finalAmount || "—"}
        </Button>
      </motion.div>
    </div>
  );
}