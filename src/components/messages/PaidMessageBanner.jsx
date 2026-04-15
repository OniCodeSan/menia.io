import { motion } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaidMessageBanner({ sender, onUnlock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 my-3 rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold mb-0.5">Messaggio a pagamento</p>
          <p className="text-xs text-muted-foreground mb-3">
            {sender} ha inviato un messaggio privato. Sblocca per leggere il contenuto completo.
          </p>
          <Button
            size="sm"
            onClick={onUnlock}
            className="bg-primary hover:bg-primary/90 glow-primary h-8 text-xs font-semibold"
          >
            <Unlock className="w-3.5 h-3.5 mr-1.5" />
            Sblocca per €4.99
          </Button>
        </div>
      </div>
    </motion.div>
  );
}