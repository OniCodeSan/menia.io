import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Loader2, CheckCircle2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateCoupon } from "@/lib/coupons";

export default function CouponField({ onApply, onRemove, appliedCoupon }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    setError("");
    setChecking(true);
    const result = await validateCoupon(code);
    setChecking(false);
    if (result.valid) {
      onApply(result.coupon);
      setOpen(false);
    } else {
      setError(result.error);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-chart-3" />
          <span className="text-sm font-semibold text-chart-3">{appliedCoupon.code}</span>
          <span className="text-xs text-muted-foreground">
            {appliedCoupon.discountPercent > 0 && `-${appliedCoupon.discountPercent}%`}
            {appliedCoupon.discountTokens > 0 && `-${appliedCoupon.discountTokens} T`}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          Hai un codice sconto?
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="Inserisci codice"
                className="bg-secondary/30 border-border/30 h-9 text-sm uppercase tracking-wider"
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleApply}
                disabled={checking || !code.trim()}
                className="h-9 px-4 bg-primary hover:bg-primary/90 font-semibold shrink-0"
              >
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Applica"}
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
