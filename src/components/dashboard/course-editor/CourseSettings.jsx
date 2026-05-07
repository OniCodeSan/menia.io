import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const PRICE_SUGGESTIONS = [9.90, 19.90, 29.90, 49.90];

const formatPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "";
  const num = Number(n);
  return num === 0 ? "" : String(num);
};

export default function CourseSettings({ course, onChange, savingState, onOpenWizard }) {
  const [local, setLocal] = useState(course);
  // Keep the price input as a string so the user can type "29.9" without
  // Number() coercion eating the decimal point or wiping characters mid-typing.
  const [priceText, setPriceText] = useState(formatPrice(course.price));

  useEffect(() => {
    setLocal(course);
  }, [course.id]);

  // Re-sync the textual price when the parent course.price is changed from
  // outside (suggestion clicks, wizard apply, draft recovery) — but never
  // while the user is editing the field locally.
  useEffect(() => {
    const externalNum = Number(course.price) || 0;
    const currentNum = Number(priceText) || 0;
    if (externalNum !== currentNum) setPriceText(formatPrice(course.price));
     
  }, [course.price]);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  // Allow digits, one period, one comma → normalize comma to period.
  const handlePriceChange = (raw) => {
    const cleaned = raw.replace(/,/g, ".");
    if (cleaned !== "" && !/^[0-9]*\.?[0-9]*$/.test(cleaned)) return;
    setPriceText(cleaned);
    // Only push to parent when the string parses to a meaningful number.
    // Trailing dot (e.g. "29.") leaves the parent value alone — autosave kicks in
    // when the user types the next digit or blurs.
    if (cleaned === "" || cleaned === ".") return;
    if (/\.$/.test(cleaned)) return;
    const n = Number(cleaned);
    if (Number.isFinite(n) && n >= 0) update({ price: n });
  };

  const handlePriceBlur = () => {
    if (priceText === "" || priceText === ".") {
      setPriceText("");
      update({ price: 0 });
      return;
    }
    const n = Number(priceText);
    if (Number.isFinite(n) && n >= 0) {
      setPriceText(formatPrice(n));
      update({ price: n });
    } else {
      // Reset to last known value
      setPriceText(formatPrice(course.price));
    }
  };

  const setSuggestedPrice = (p) => {
    setPriceText(formatPrice(p));
    update({ price: p });
  };

  return (
    <div className="bg-card border-b border-border/30 px-4 py-3 sticky top-0 z-30 backdrop-blur bg-card/90">
      <div className="flex items-center gap-3 mb-3">
        <Link to="/dashboard">
          <Button size="sm" variant="ghost"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="font-heading font-bold text-base flex-1 truncate">
          {local.title || "Nuovo corso"}
        </h1>
        <SaveIndicator state={savingState} />
        {onOpenWizard && (
          <Button size="sm" variant="outline" onClick={onOpenWizard}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Generatore guidato
          </Button>
        )}
        {course.id && (
          <Link to={`/courses/${course.id}`}>
            <Button size="sm" variant="outline"><Eye className="w-3.5 h-3.5 mr-1" /> Anteprima</Button>
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-[1fr_120px_2fr_auto] gap-2 items-center">
        <Input
          placeholder="Titolo corso"
          value={local.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          className="h-9"
        />
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Prezzo €"
          value={priceText}
          onChange={(e) => handlePriceChange(e.target.value)}
          onBlur={handlePriceBlur}
          className="h-9"
        />
        <Input
          placeholder="Link pagamento esterno (Stripe / Gumroad / ...)"
          value={local.external_payment_link || ""}
          onChange={(e) => update({ external_payment_link: e.target.value })}
          className="h-9"
        />
        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 h-9">
          <Switch checked={!!local.is_published} onCheckedChange={(v) => update({ is_published: v })} />
          <span className="text-xs font-semibold whitespace-nowrap">
            {local.is_published ? "Pubblicato" : "Bozza"}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
        I corsi sono inclusi nell'abbonamento Menia (€0,99/mese per gli studenti).
        Prezzo e link esterno sono usati solo se vendi il corso singolarmente fuori dalla subscription.
      </p>
      <div className="flex gap-1 mt-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground self-center">Prezzi suggeriti (vendita diretta):</span>
        {PRICE_SUGGESTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSuggestedPrice(p)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground"
          >€{p}</button>
        ))}
      </div>
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Salvataggio...</span>;
  if (state === "saved") return <span className="text-xs text-chart-3">✓ Salvato</span>;
  if (state === "error") return <span className="text-xs text-destructive">✗ Errore</span>;
  return null;
}
