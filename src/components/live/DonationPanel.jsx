import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Crown, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { walletService } from "@/lib/wallet";
import { processDonation } from "@/lib/monetization";
import { hasSupabase, supabase } from "@/lib/supabase";

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];
const MIN_DONATION = 10;

export default function DonationPanel({ liveId, creatorId, creatorName, isSubscribed, onDonated }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [donated, setDonated] = useState(false);
  const [activeTab, setActiveTab] = useState("donate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setBalance(null); return; }
    walletService.getUserWallet(user.id)
      .then((w) => { if (!cancelled) setBalance(w?.balance ?? 0); })
      .catch(() => { if (!cancelled) setBalance(0); });
    return () => { cancelled = true; };
  }, [user]);

  const parsedAmount = parseInt(amount, 10);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount >= MIN_DONATION && parsedAmount <= 100000;

  const handleDonate = async () => {
    setError("");
    if (!user) { setError("Devi accedere per donare token."); return; }
    if (!validAmount) { setError(`Minimo ${MIN_DONATION} token.`); return; }
    if (balance !== null && parsedAmount > balance) {
      setError("Saldo token insufficiente.");
      return;
    }
    setLoading(true);
    try {
      await processDonation(user.id, creatorId, parsedAmount, liveId);
      setBalance((b) => (b === null ? b : b - parsedAmount));

      if (hasSupabase && liveId) {
        await supabase.from("live_chat_messages").insert({
          live_id: liveId,
          user_id: user.id,
          message: `Ha donato ${parsedAmount} Token!`,
          type: "donation",
          donation_amount: parsedAmount,
        });
      }

      setDonated(true);
      onDonated?.({ id: Date.now(), user: user.full_name || "Tu", amount: parsedAmount, type: "donation" });
      setTimeout(() => setDonated(false), 3000);
      setAmount("");
    } catch (e) {
      setError(e?.message || "Errore durante la donazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-1 mb-4 bg-secondary/40 p-1 rounded-xl">
        {[
          { id: "donate", label: "Dona", icon: Zap },
          { id: "sub", label: "Abbonati", icon: Crown },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "donate" ? (
          <motion.div key="donate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Supporta {creatorName} con i tuoi Token</p>
              {balance !== null && (
                <span className="text-[11px] font-semibold text-chart-4 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {balance} T
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a.toString())}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    amount === a.toString()
                      ? "bg-chart-4/20 border-chart-4/50 text-chart-4"
                      : "border-border/30 hover:border-chart-4/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a} T
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                type="number"
                min={MIN_DONATION}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Token personalizzati (min ${MIN_DONATION})`}
                className="flex-1 bg-secondary/40 border-border/30 h-9 text-sm"
              />
            </div>
            {error && <p className="text-[11px] text-destructive mb-2">{error}</p>}
            {!user && (
              <p className="text-[11px] text-muted-foreground mb-2">
                <Link to="/fan-login" className="text-primary underline">Accedi</Link> per donare token.
              </p>
            )}
            <AnimatePresence>
              {donated ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-chart-3/15 border border-chart-3/30 text-chart-3 text-sm font-semibold"
                >
                  <Heart className="w-4 h-4 fill-chart-3" />
                  Donazione inviata! Grazie
                </motion.div>
              ) : (
                <Button
                  onClick={handleDonate}
                  disabled={loading || !validAmount}
                  className="w-full h-9 bg-chart-4 hover:bg-chart-4/90 text-background font-semibold text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
                  Dona {validAmount ? `${parsedAmount} T` : "Token"}
                </Button>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isSubscribed ? (
              <div className="text-center py-4">
                <Crown className="w-8 h-8 text-chart-4 mx-auto mb-2" />
                <p className="text-sm font-semibold mb-1">Sei già abbonato!</p>
                <p className="text-xs text-muted-foreground">Hai accesso a tutti i contenuti premium e live esclusivi.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-4">Sblocca accesso esclusivo ai live e ai contenuti premium</p>
                <div className="space-y-2 mb-4">
                  {["Accesso a tutti i live", "Contenuti premium illimitati", "Badge abbonato in chat", "Messaggi diretti"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Crown className="w-2.5 h-2.5 text-primary" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <Link to="/checkout">
                  <Button className="w-full h-9 bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm">
                    <Crown className="w-4 h-4 mr-1.5" />
                    Abbonati — 120 Token / mese
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
