import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

const CONSENT_KEY = "tokaro:cookie_consent";

const listeners = new Set();
export function openCookieSettings() {
  listeners.forEach(fn => fn(true));
}

function getConsent() {
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...value, ts: Date.now() }));
}

export function hasAnalyticsConsent() {
  const c = getConsent();
  return c?.analytics === true;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const { t } = useLanguage();
  const cb = t.cookieBanner;

  useEffect(() => {
    const c = getConsent();
    if (!c) setVisible(true);
    listeners.add(setVisible);
    return () => listeners.delete(setVisible);
  }, []);

  const accept = () => {
    setConsent({ necessary: true, analytics: true });
    setVisible(false);
  };

  const reject = () => {
    setConsent({ necessary: true, analytics: false });
    setVisible(false);
  };

  const saveCustom = () => {
    setConsent({ necessary: true, analytics });
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6"
        >
          <div className="max-w-2xl mx-auto bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{cb.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cb.description}
                    {" "}{cb.readOur}{" "}
                    <Link to="/cookie-policy" className="text-primary hover:underline">{cb.cookiePolicy}</Link>
                    {" "}{cb.andThe}{" "}
                    <Link to="/privacy" className="text-primary hover:underline">{cb.privacyPolicy}</Link>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {cb.customize}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="space-y-3 pb-2">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20">
                        <div>
                          <p className="text-sm font-semibold">{cb.technicalCookies}</p>
                          <p className="text-xs text-muted-foreground">{cb.technicalDesc}</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-primary/30 flex items-center justify-end px-0.5">
                          <div className="w-4 h-4 rounded-full bg-primary" />
                        </div>
                      </label>

                      <label
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20 cursor-pointer"
                        onClick={() => setAnalytics(v => !v)}
                      >
                        <div>
                          <p className="text-sm font-semibold">{cb.analyticsCookies}</p>
                          <p className="text-xs text-muted-foreground">{cb.analyticsDesc}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${analytics ? "bg-primary/30 justify-end" : "bg-border justify-start"}`}>
                          <div className={`w-4 h-4 rounded-full transition-colors ${analytics ? "bg-primary" : "bg-muted-foreground"}`} />
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row gap-2">
                {showDetails ? (
                  <Button onClick={saveCustom} className="flex-1 bg-primary hover:bg-primary/90 font-semibold text-sm h-10">
                    {cb.savePreferences}
                  </Button>
                ) : (
                  <Button onClick={accept} className="flex-1 bg-primary hover:bg-primary/90 font-semibold text-sm h-10">
                    {cb.acceptAll}
                  </Button>
                )}
                <Button onClick={reject} variant="outline" className="flex-1 border-border/50 font-semibold text-sm h-10">
                  {cb.rejectAll}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
