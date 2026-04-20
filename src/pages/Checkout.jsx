import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Check, Crown, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { processSubscription, processContentUnlock } from "@/lib/monetization";
import { supabase, hasSupabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage";
import { useLanguage } from "@/lib/LanguageContext";
import { toast } from "@/components/ui/use-toast";

export default function Checkout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tCK = t.checkout;
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const creatorParam = params.get("creator");
  const contentParam = params.get("content");
  const modeParam = params.get("mode");
  const creatorIdParam = params.get("creator_id");
  const tierParam = params.get("tier") || "base";

  const [creator, setCreator] = useState(null);
  const [content, setContent] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [plan, setPlan] = useState("monthly");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let resolvedCreator = null;
      let resolvedContent = null;

      if (hasSupabase && (creatorIdParam || creatorParam)) {
        let query = supabase.from("profiles").select("id, full_name, handle, avatar_url, bio, role");
        if (creatorIdParam) query = query.eq("id", creatorIdParam);
        else query = query.eq("handle", creatorParam).eq("role", "creator");
        const { data: profile } = await query.maybeSingle();

        if (!cancelled && profile) {
          resolvedCreator = {
            id: profile.id,
            handle: profile.handle || profile.id.slice(0, 8),
            name: profile.full_name || "Creator",
            avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || "C")}&background=7c3aed&color=fff&size=200`,
            subscriptionTokenMonthly: 100,
            subscriptionTokenYearly: 840,
            isReal: true,
          };
        }
      }


      if (hasSupabase && contentParam) {
        const { data: post } = await supabase
          .from("posts")
          .select("id, creator_id, title, description, media_url, media_path, access, price, type")
          .eq("id", contentParam)
          .maybeSingle();
        if (!cancelled && post) {
          let imageUrl = post.media_url || "/tokaro-logo.png";
          if (post.media_path) {
            const signed = await storageService.getSignedUrl(post.media_path);
            if (signed) imageUrl = signed;
          }
          resolvedContent = {
            id: post.id,
            title: post.title,
            image: imageUrl,
            type: post.access === "public" ? "free" : "premium",
            unlockPriceTokens: post.price || 0,
          };
          if (!resolvedCreator) {
            const { data: cp } = await supabase
              .from("profiles")
              .select("id, full_name, handle, avatar_url")
              .eq("id", post.creator_id)
              .maybeSingle();
            if (cp) {
              resolvedCreator = {
                id: cp.id,
                handle: cp.handle || cp.id.slice(0, 8),
                name: cp.full_name || "Creator",
                avatar: cp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cp.full_name || "C")}&background=7c3aed&color=fff&size=200`,
                subscriptionTokenMonthly: 100,
                subscriptionTokenYearly: 840,
                isReal: true,
              };
            }
          }
        }
      }


      if (!cancelled) {
        setCreator(resolvedCreator);
        setContent(resolvedContent);
        setLoadingData(false);
      }
    })();

    return () => { cancelled = true; };
  }, [creatorParam, contentParam, creatorIdParam]);

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="font-heading text-xl font-bold mb-2">Creator non trovato</p>
          <p className="text-sm text-muted-foreground mb-4">Il creator richiesto non esiste o non è disponibile.</p>
          <Link to="/explore">
            <Button className="bg-primary hover:bg-primary/90">Esplora creator</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isUnlock = modeParam === "unlock" && content;
  const monthly = creator.subscriptionTokenMonthly || 100;
  const yearly = creator.subscriptionTokenYearly || 840;
  const yearlyFullPrice = monthly * 12;
  const yearlyDiscount = yearlyFullPrice - yearly;
  const yearlySavingsPct = Math.round((yearlyDiscount / yearlyFullPrice) * 100);
  const unlockPrice = isUnlock ? content.unlockPriceTokens : 0;
  const finalTokens = isUnlock ? unlockPrice : plan === "monthly" ? monthly : yearly;

  const handleCheckout = async () => {
    if (!user) {
      navigate("/fan-login", { state: { from: `/checkout?${params.toString()}` } });
      return;
    }
    setError("");
    setProcessing(true);
    try {
      if (isUnlock) {
        await processContentUnlock(user.id, content.id);
        toast({ title: "Contenuto sbloccato!" });
        setDone(true);
      } else {
        const cid = creatorIdParam || creator.id;
        if (!cid) throw new Error("Creator non valido");
        const tier = tierParam === "premium" ? "premium" : "base";
        await processSubscription(user.id, cid, tier);
        toast({ title: `Abbonamento attivato per ${creator.name}!` });
        setDone(true);
      }
    } catch (e) {
      setError(e.message || tCK.errorDefault);
    } finally {
      setProcessing(false);
    }
  };

  const backHref = `/creator/${creator.handle}`;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link to={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          {tCK.backToProfile} {creator.name}
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            <h1 className="font-heading text-2xl font-bold mb-6">
              {isUnlock ? tCK.unlockTitle : tCK.subscribeTitle}
            </h1>

            {isUnlock ? (
              <div className="bg-card/50 border border-border/30 rounded-2xl p-6 mb-6">
                <h3 className="font-heading font-bold text-sm mb-4">{tCK.selectedContent}</h3>
                <div className="flex items-center gap-4">
                  <img src={content.image} alt={content.title} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{content.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{tCK.byLabel} {creator.name}</p>
                    <p className="text-base font-heading font-bold text-primary mt-1">{unlockPrice} T</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card/50 border border-border/30 rounded-2xl p-6 mb-6">
                <h3 className="font-heading font-bold text-sm mb-4">{tCK.choosePlan}</h3>
                <RadioGroup value={plan} onValueChange={setPlan} className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    plan === "monthly" ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                  }`}>
                    <RadioGroupItem value="monthly" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{tCK.monthly}</p>
                      <p className="text-xs text-muted-foreground">{tCK.monthlyDesc}</p>
                    </div>
                    <p className="font-heading font-bold text-lg">{monthly} {tCK.perMonth}</p>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all relative ${
                    plan === "yearly" ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                  }`}>
                    <RadioGroupItem value="yearly" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{tCK.yearly}</p>
                      <p className="text-xs text-muted-foreground">{tCK.yearlyDescPrefix} {yearlySavingsPct}% {tCK.yearlyDescSuffix}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-lg">{Math.round(yearly / 12)} {tCK.perMonth}</p>
                      <p className="text-xs text-chart-3 font-semibold">{tCK.save} {yearlyDiscount} T</p>
                    </div>
                    <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-chart-3 text-[10px] font-bold text-background">
                      -{yearlySavingsPct}%
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
              <p className="text-sm text-muted-foreground mb-4">{tCK.description}</p>

              {error && <p className="text-sm text-destructive mb-3">{error}</p>}

              {done ? (
                <div className="flex items-center gap-2 text-chart-3 text-sm p-3 rounded-xl bg-chart-3/10 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> {isUnlock ? tCK.contentUnlocked : tCK.subscriptionActivated}
                </div>
              ) : (
                <Button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-primary hover:bg-primary/90 glow-primary font-semibold h-12 text-base"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {isUnlock
                        ? `${tCK.unlockBtn} — ${finalTokens} T`
                        : `${tCK.confirmBtn} — ${finalTokens} ${plan === "yearly" ? tCK.perYear : tCK.perMonth}`}
                    </>
                  )}
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span>{isUnlock ? tCK.secureCheckoutUnlock : tCK.cancelAnytime}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6 sticky top-24">
              <h3 className="font-heading font-bold text-sm mb-4">{tCK.summary}</h3>

              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/30">
                <img src={creator.avatar} alt={creator.name} className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <p className="font-semibold">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUnlock
                      ? tCK.unlockLabel
                      : plan === "monthly" ? tCK.subscriptionLabelMonthly : tCK.subscriptionLabelYearly}
                  </p>
                </div>
              </div>

              {!isUnlock && (
                <div className="space-y-3 mb-6">
                  {tCK.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border/30 pt-4 space-y-2">
                {isUnlock ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{tCK.contentColumn}</span>
                      <span>{unlockPrice} T</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-border/30">
                      <span>{tCK.total}</span>
                      <span className="text-primary">{unlockPrice} T</span>
                    </div>
                  </>
                ) : plan === "monthly" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{tCK.subtotal}</span>
                      <span>{monthly} T</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-border/30">
                      <span>{tCK.total}</span>
                      <span className="text-primary">{monthly} {tCK.perMonth}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{tCK.subtotal} ({monthly} T × 12)</span>
                      <span>{yearlyFullPrice} T</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-chart-3">{tCK.yearlyDiscount} (-{yearlySavingsPct}%)</span>
                      <span className="text-chart-3">-{yearlyDiscount} T</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-border/30">
                      <span>{tCK.total}</span>
                      <span className="text-primary">{yearly} {tCK.perYear}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  {isUnlock ? tCK.instantAccess : tCK.cancelAnytimeBox}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
