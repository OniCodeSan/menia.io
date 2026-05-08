import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

const CONSENT_KEY = "menia:cookie_consent";
const SESSION_ID_KEY = "menia:session_id";

function getSessionId() {
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    if (crypto.randomUUID) {
      sid = crypto.randomUUID();
    } else {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      sid = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
}

const listeners = new Set();
export function openCookieSettings() {
  listeners.forEach(fn => fn(true));
}

function getConsent() {
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}

function setConsent(value, action = "accept") {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...value, ts: Date.now() }));
  // Notifica gtag (Google Analytics Consent Mode v2). Il tag è in index.html
  // con default 'denied'; qui aggiorna in base alla scelta dell'utente.
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: value.analytics ? "granted" : "denied",
    });
  }
  fetch("/api/gdpr/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consent_type: "cookie",
      categories: value,
      action,
      policy_version: "1.0",
      session_id: getSessionId(),
    }),
  }).catch(() => {});
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
    setConsent({ necessary: true, analytics: true }, "accept");
    setVisible(false);
  };

  const reject = () => {
    setConsent({ necessary: true, analytics: false }, "reject");
    setVisible(false);
  };

  const saveCustom = () => {
    setConsent({ necessary: true, analytics }, "update");
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
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[100]"
        >
          <div className="bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <Cookie className="w-4 h-4 text-chart-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm mb-0.5">{cb.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cb.description}
                    {" "}<Link to="/cookie-policy" className="text-primary hover:underline">{cb.cookiePolicy}</Link>
                    {" · "}<Link to="/privacy" className="text-primary hover:underline">{cb.privacyPolicy}</Link>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
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
                  <Button onClick={saveCustom} className="flex-1 bg-primary hover:bg-primary/90 font-semibold text-xs h-9">
                    {cb.savePreferences}
                  </Button>
                ) : (
                  <Button onClick={accept} className="flex-1 bg-primary hover:bg-primary/90 font-semibold text-xs h-9">
                    {cb.acceptAll}
                  </Button>
                )}
                <Button onClick={reject} variant="outline" className="flex-1 border-border/50 font-semibold text-xs h-9">
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
