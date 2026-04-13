import { useLanguage } from "@/lib/LanguageContext";

const FLAG_LABELS = {
  it: "🇮🇹 IT",
  en: "🇬🇧 EN",
  fr: "🇫🇷 FR",
  de: "🇩🇪 DE",
  es: "🇪🇸 ES",
  ru: "🇷🇺 RU",
};

export default function LanguageSwitcher() {
  const { lang, changeLanguage } = useLanguage();

  return (
    <select
      value={lang}
      onChange={(e) => changeLanguage(e.target.value)}
      className="bg-secondary/50 border border-border/40 text-foreground text-xs font-semibold rounded-lg px-2 py-1.5 cursor-pointer hover:bg-secondary transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {Object.entries(FLAG_LABELS).map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}