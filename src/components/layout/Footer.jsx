import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="border-t border-border/30 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/tokaro-logo.png"
            alt="Tokaro.fans"
            className="w-8 h-8 rounded-full group-hover:scale-105 transition-transform duration-300"
          />
          <span className="font-heading font-bold">Tokaro.fans</span>
        </Link>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">{f.privacy}</a>
          <Link to="/terms" className="hover:text-foreground transition-colors">{f.terms}</Link>
          <Link to="/support" className="hover:text-foreground transition-colors">{f.support}</Link>
        </div>
        <p className="text-xs text-muted-foreground">{f.copyright}</p>
      </div>
    </footer>
  );
}