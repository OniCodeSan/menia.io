import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { processDonation } from "@/lib/monetization";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";

const PRESET_AMOUNTS = [20, 50, 100, 200];
const MIN_DONATION = 10;

export default function DonationModal({ creatorId, creatorName, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tDM = t.donationModal;
  const navigate = useNavigate();
  const location = useLocation();
  const [amount, setAmount] = useState(20);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const finalAmount = custom ? parseInt(custom) : amount;
  const isBelowMin = finalAmount > 0 && finalAmount < MIN_DONATION;
  const isValid = finalAmount >= MIN_DONATION && finalAmount <= 100000;

  const handleDonate = async () => {
    if (!user) {
      navigate("/fan-login", { state: { from: location.pathname } });
      return;
    }
    if (!isValid) {
      setError(tDM.minError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await processDonation(user.id, creatorId, finalAmount);
      setSuccess(true);
      setTimeout(() => onClose?.(), 1500);
    } catch (e) {
      setError(e.message || tDM.errorDefault);
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
            <h3 className="font-heading font-bold text-lg">{tDM.title} {creatorName}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{tDM.description}</p>

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
              {a} T
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{tDM.customLabel}</label>
          <Input
            type="number"
            min="1"
            placeholder={tDM.customPlaceholder}
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>

        {isBelowMin && (
          <div className="flex items-center gap-2 text-xs text-destructive p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {tDM.minError}
          </div>
        )}
        {error && !isBelowMin && <p className="text-xs text-destructive">{error}</p>}
        {success ? (
          <div className="flex items-center gap-2 text-chart-3 text-sm p-3 rounded-xl bg-chart-3/10">
            <CheckCircle2 className="w-4 h-4" /> {tDM.success}
          </div>
        ) : (
          <Button
            onClick={handleDonate}
            disabled={loading || !isValid}
            className="w-full h-11 bg-chart-5 hover:bg-chart-5/90 font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
            {!user ? tDM.loginFor : `${tDM.donateBtn} ${finalAmount || "—"} ${tDM.tokens}`}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
