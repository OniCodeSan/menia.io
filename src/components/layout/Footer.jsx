import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="border-t border-border/30 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full border-2 border-chart-4 bg-chart-4/20 flex items-center justify-center group-hover:bg-chart-4/30 transition-all duration-300">
            <Zap className="w-4 h-4 text-chart-4" />
          </div>
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