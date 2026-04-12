import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const PLANS = [
  {
    id: "base",
    label: "Base",
    price: "€4,99/mese",
    priceId: "price_1TLW1hKGgg4giFxcmAidRxnx",
    features: ["Contenuti esclusivi base", "Messaggi diretti", "Community access"],
    color: "border-primary/40 bg-primary/5",
    btnClass: "bg-primary hover:bg-primary/90",
  },
  {
    id: "pro",
    label: "Pro",
    price: "€9,99/mese",
    priceId: "price_1TLW1hKGgg4giFxc1pIVi1DJ",
    features: ["Tutto del piano Base", "Live esclusive", "Contenuti premium", "Badge fan Pro"],
    color: "border-chart-4/40 bg-chart-4/5",
    btnClass: "bg-chart-4 hover:bg-chart-4/90",
    popular: true,
  },
];

export default function SubscriptionModal({ creatorName, onClose }) {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    if (window.self !== window.top) {
      alert("I pagamenti funzionano solo dall'app pubblicata, non dall'anteprima.");
      return;
    }
    setLoading(plan.id);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        type: "subscription",
        priceId: plan.priceId,
        creatorName,
        successUrl: window.location.origin + window.location.pathname + "?sub=success",
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg bg-card border border-border/40 rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-chart-4" />
            <h3 className="font-heading font-bold text-lg">Abbonati a {creatorName}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`border rounded-2xl p-4 space-y-4 relative ${plan.color}`}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 bg-chart-4 text-white rounded-full">
                  POPOLARE
                </span>
              )}
              <div>
                <p className="font-heading font-bold text-base">{plan.label}</p>
                <p className="text-lg font-bold mt-0.5">{plan.price}</p>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id}
                className={`w-full h-9 text-sm font-semibold text-white ${plan.btnClass}`}
              >
                {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `Scegli ${plan.label}`}
              </Button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}