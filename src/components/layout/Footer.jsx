import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { openCookieSettings } from "@/components/shared/CookieBanner";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="border-t border-border/30 py-10 sm:py-12 px-4 sm:px-6 hidden md:block">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-3">
              <img
                src="/menia-logo.png"
                alt="Menia.io"
                className="w-9 h-9 group-hover:scale-105 transition-transform duration-300"
              />
              <span className="font-heading font-bold">Menia.io</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              {f.description}
            </p>
          </div>

          {/* Piattaforma */}
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">{f.platform}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/courses" className="block hover:text-foreground transition-colors">{f.courses}</Link>
              <Link to="/trainer" className="block hover:text-foreground transition-colors">Formatori</Link>
              <Link to="/pricing" className="block hover:text-foreground transition-colors">{f.pricing || "Piani"}</Link>
            </div>
          </div>

          {/* Per formatori */}
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">Per formatori</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/trainer-login?mode=register" className="block hover:text-foreground transition-colors">Diventa formatore</Link>
              <Link to="/trainer-login" className="block hover:text-foreground transition-colors">Login formatore</Link>
            </div>
          </div>

          {/* Legale */}
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">{f.legal}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/terms" className="block hover:text-foreground transition-colors">{f.terms}</Link>
              <Link to="/privacy" className="block hover:text-foreground transition-colors">{f.privacy}</Link>
              <Link to="/cookie-policy" className="block hover:text-foreground transition-colors">{f.cookiePolicy}</Link>
              <button onClick={openCookieSettings} className="block text-left hover:text-foreground transition-colors">{f.cookieSettings}</button>
              <Link to="/policy" className="block hover:text-foreground transition-colors">{f.contentPolicy}</Link>
            </div>
          </div>

          {/* Supporto */}
          <div>
            <h4 className="font-heading font-bold text-sm mb-3">Supporto</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/support" className="block hover:text-foreground transition-colors">Assistenza</Link>
              <a href="mailto:support@menia.io" className="block hover:text-foreground transition-colors">support@menia.io</a>
            </div>
            <h4 className="font-heading font-bold text-sm mt-5 mb-3">{f.followUs}</h4>
            <div className="flex gap-2">
              <a href="https://www.instagram.com/meniafans/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
                className="w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.17V12a4.85 4.85 0 01-3.77-1.54V6.69h3.77z"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 pt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">{f.copyright}</p>
          <p className="text-xs text-muted-foreground">P.IVA IT10246321219</p>
        </div>
      </div>
    </footer>
  );
}
