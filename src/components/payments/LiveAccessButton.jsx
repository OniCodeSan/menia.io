import { useState } from "react";
import { Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// price_1TLW1hKGgg4giFxcx3aZkaZM = Accesso Live €2.99
const LIVE_PRICE_ID = "price_1TLW1hKGgg4giFxcx3aZkaZM";

export default function LiveAccessButton({ creatorName, className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (window.self !== window.top) {
      alert("I pagamenti funzionano solo dall'app pubblicata, non dall'anteprima.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        type: "live_access",
        priceId: LIVE_PRICE_ID,
        creatorName,
        successUrl: window.location.origin + window.location.pathname + "?live=success",
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuy}
      disabled={loading}
      className={`bg-destructive hover:bg-destructive/90 font-semibold ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Radio className="w-4 h-4 mr-2" />
      )}
      Accedi alla Live — €2,99
    </Button>
  );
}