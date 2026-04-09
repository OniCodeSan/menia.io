import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Shield, ArrowLeft, Check, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link } from "react-router-dom";

export default function Checkout() {
  const [plan, setPlan] = useState("monthly");
  const [processing, setProcessing] = useState(false);

  const handleCheckout = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link to="/creator" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Torna indietro
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Payment form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            <h1 className="font-heading text-2xl font-bold mb-6">Completa l'acquisto</h1>

            {/* Plan selection */}
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6 mb-6">
              <h3 className="font-heading font-bold text-sm mb-4">Scegli il tuo piano</h3>
              <RadioGroup value={plan} onValueChange={setPlan} className="space-y-3">
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  plan === "monthly" ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                }`}>
                  <RadioGroupItem value="monthly" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mensile</p>
                    <p className="text-xs text-muted-foreground">Accesso completo, rinnovo mensile</p>
                  </div>
                  <p className="font-heading font-bold text-lg">€9.99<span className="text-xs text-muted-foreground font-normal">/mese</span></p>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all relative ${
                  plan === "yearly" ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                }`}>
                  <RadioGroupItem value="yearly" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Annuale</p>
                    <p className="text-xs text-muted-foreground">Risparmia il 30% — fatturazione annuale</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-lg">€6.99<span className="text-xs text-muted-foreground font-normal">/mese</span></p>
                    <p className="text-xs text-chart-3 font-semibold">Risparmia €36</p>
                  </div>
                  <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-chart-3 text-[10px] font-bold text-background">
                    -30%
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Payment details */}
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
              <h3 className="font-heading font-bold text-sm mb-4">Dati di pagamento</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Nome sulla carta</Label>
                  <Input placeholder="Mario Rossi" className="bg-secondary/30 border-border/30 h-11" />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Numero carta</Label>
                  <Input placeholder="4242 4242 4242 4242" className="bg-secondary/30 border-border/30 h-11" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Scadenza</Label>
                    <Input placeholder="MM/AA" className="bg-secondary/30 border-border/30 h-11" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">CVV</Label>
                    <Input placeholder="123" className="bg-secondary/30 border-border/30 h-11" />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={processing}
                className="w-full mt-6 bg-primary hover:bg-primary/90 glow-primary font-semibold h-12 text-base"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Paga {plan === "monthly" ? "€9.99" : "€83.88"}
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span>Pagamento sicuro e criptato</span>
              </div>
            </div>
          </motion.div>

          {/* Order summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6 sticky top-24">
              <h3 className="font-heading font-bold text-sm mb-4">Riepilogo ordine</h3>
              
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/30">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                  alt="Creator"
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div>
                  <p className="font-semibold">Sara Rossi</p>
                  <p className="text-xs text-muted-foreground">Abbonamento {plan === "monthly" ? "Mensile" : "Annuale"}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "Tutti i contenuti premium",
                  "Accesso community esclusiva",
                  "Messaggi diretti",
                  "Contenuti anticipati",
                  "Badge abbonato",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/30 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotale</span>
                  <span>{plan === "monthly" ? "€9.99" : "€83.88"}</span>
                </div>
                {plan === "yearly" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-chart-3">Risparmio annuale</span>
                    <span className="text-chart-3">-€36.00</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border/30">
                  <span>Totale</span>
                  <span className="text-primary">{plan === "monthly" ? "€9.99" : "€83.88"}</span>
                </div>
              </div>

              <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Cancella in qualsiasi momento</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}