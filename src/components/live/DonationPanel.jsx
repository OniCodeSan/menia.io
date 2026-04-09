import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Crown, Heart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const QUICK_AMOUNTS = [2, 5, 10, 20, 50];

export default function DonationPanel({ creatorName, isSubscribed }) {
  const [amount, setAmount] = useState("");
  const [donated, setDonated] = useState(false);
  const [activeTab, setActiveTab] = useState("donate");

  const handleDonate = () => {
    if (!amount && !parseInt(amount)) return;
    setDonated(true);
    setTimeout(() => setDonated(false), 3000);
    setAmount("");
  };

  return (
    <div className="p-4">
      {/* Tabs */}
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
            <p className="text-xs text-muted-foreground mb-3">Supporta {creatorName} con una donazione</p>
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
                  €{a}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Importo personalizzato..."
                className="flex-1 bg-secondary/40 border-border/30 h-9 text-sm"
              />
            </div>
            <AnimatePresence>
              {donated ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-chart-3/15 border border-chart-3/30 text-chart-3 text-sm font-semibold"
                >
                  <Heart className="w-4 h-4 fill-chart-3" />
                  Donazione inviata! Grazie ❤️
                </motion.div>
              ) : (
                <Button
                  onClick={handleDonate}
                  disabled={!amount}
                  className="w-full h-9 bg-chart-4 hover:bg-chart-4/90 text-background font-semibold text-sm"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Dona {amount ? `€${amount}` : ""}
                </Button>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isSubscribed ? (
              <div className="text-center py-4">
                <Crown className="w-8 h-8 text-chart-4 mx-auto mb-2" />
                <p className="text-sm font-semibold mb-1">Sei già abbonato! 🎉</p>
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
                    Abbonati — €9.99/mese
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