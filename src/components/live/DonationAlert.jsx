import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function DonationAlert({ donation }) {
  return (
    <AnimatePresence>
      {donation && (
        <motion.div
          key={donation.id}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3 rounded-2xl glass-strong border border-chart-4/40"
          style={{ boxShadow: "0 0 30px hsl(45 90% 60% / 0.3)" }}
        >
          <Zap className="w-5 h-5 text-chart-4" />
          <div>
            <span className="text-sm font-bold text-chart-4">{donation.user}</span>
            <span className="text-sm text-foreground"> ha donato </span>
            <span className="text-sm font-bold text-chart-4">€{donation.amount}!</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}