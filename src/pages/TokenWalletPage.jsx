import { useState, useEffect } from "react";
import { Coins, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import UserWallet from "../components/wallet/UserWallet";

export default function TokenWalletPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Coins className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">Il tuo Wallet Token</h2>
          <p className="text-muted-foreground text-sm">Accedi per gestire i tuoi token</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => base44.auth.redirectToLogin("/fan-dashboard?tab=wallet")}>
          Accedi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <UserWallet user={user} />
    </div>
  );
}