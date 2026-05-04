import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

// Tooltip self-contained: click-to-toggle (mobile-friendly), hover-to-show
// (desktop), click-outside-to-close. Niente Radix Provider richiesto, niente
// dipendenze: una <span> con popup assoluto.
export default function InfoTooltip({ text, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Maggiori informazioni"
        className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground cursor-help"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          // normal-case + tracking-normal: il tooltip eredita uppercase/tracking-wide
          // dalle label dei card (StatCard, ecc.). Forziamo case corretto.
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 px-2.5 py-1.5 rounded-md bg-foreground text-background text-[11px] font-normal leading-snug shadow-lg whitespace-normal min-w-[180px] max-w-[260px] text-left normal-case tracking-normal"
        >
          {text}
        </span>
      )}
    </span>
  );
}
