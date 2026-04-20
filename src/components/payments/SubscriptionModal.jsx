import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, X, Check, Loader2, CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processSubscription } from "@/lib/monetization";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const DEFAULT_MONTHLY = 100;
const DEFAULT_BASE_FRACTION = 0.5;

export default function SubscriptionModal({
  creatorId,
  creatorName,
  creatorHandle,
  monthlyTokens = DEFAULT_MONTHLY,
  yearlyTokens,
  onClose,
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tSM = t.subscriptionModal;
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState(null);

  const baseTokens = Math.max(10, Math.round(monthlyTokens * DEFAULT_BASE_FRACTION));
  const proTokens = monthlyTokens;

  const plans = [
    {
      id: "base",
      label: tSM.planBase,
      price: `${baseTokens} ${tSM.perMonth}`,
      tokens: baseTokens,
      features: tSM.featuresBase,
      color: "border-primary/40 bg-primary/5",
      btnClass: "bg-primary hover:bg-primary/90",
    },
    {
      id: "pro",
      label: tSM.planPro,
      price: `${proTokens} ${tSM.perMonth}`,
      tokens: proTokens,
      features: tSM.featuresPro,
      color: "border-chart-4/40 bg-chart-4/5",
      btnClass: "bg-chart-4 hover:bg-chart-4/90",
      popular: true,
    },
  ];

  const goToLogin = () => {
    const fromPath = location.pathname + location.search;
    navigate("/fan-login", { state: { from: fromPath } });
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      goToLogin();
      return;
    }
    setError("");
    setLoading(plan.id);
    try {
      const tier = plan.id === "pro" ? "premium" : "base";
      await processSubscription(user.id, creatorId, tier);

      setDoneId(plan.id);
      toast.success(`Abbonamento ${plan.label} attivato per ${creatorName}!`);
      setTimeout(() => onClose?.({ subscribed: true, tier }), 1800);
    } catch (e) {
      setError(e.message || tSM.errorDefault);
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
            <h3 className="font-heading font-bold text-lg">{tSM.title} {creatorName}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm">
            <LogIn className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-foreground font-medium">{tSM.loginRequired}</p>
              <button
                onClick={goToLogin}
                className="text-xs text-primary hover:underline mt-0.5"
              >
                {tSM.goToLogin}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {yearlyTokens && (
          <p className="text-xs text-muted-foreground text-center">
            {tSM.yearlyBadgePrefix} <span className="font-semibold text-foreground">{yearlyTokens} {tSM.perYear}</span>
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`border rounded-2xl p-4 space-y-4 relative ${plan.color}`}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 bg-chart-4 text-white rounded-full">
                  {tSM.popular}
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
                disabled={loading === plan.id || doneId != null}
                className={`w-full h-9 text-sm font-semibold text-white ${plan.btnClass}`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : doneId === plan.id ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1" /> {tSM.active}</>
                ) : !user ? (
                  `${tSM.loginFor} ${plan.label}`
                ) : (
                  `${tSM.choose} ${plan.label}`
                )}
              </Button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
