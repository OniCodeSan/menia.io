import { Coins, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import UserWallet from "../components/wallet/UserWallet";

export default function TokenWalletPage() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
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
        <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/fan-login")}>
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
