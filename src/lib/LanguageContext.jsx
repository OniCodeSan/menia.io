import { createContext, useContext, useState, useEffect } from "react";
import { translations, detectLanguage, SUPPORTED_LANGS } from "./i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("unlockr_lang");
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    return detectLanguage();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manual = localStorage.getItem("unlockr_lang_manual");
    if (manual === "1") {
      setLoading(false);
      return;
    }

    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        const countryLangMap = {
          IT: "it", FR: "fr", DE: "de", AT: "de", CH: "de",
          ES: "es", MX: "es", AR: "es", CO: "es", CL: "es",
          RU: "ru", BY: "ru", KZ: "ru",
          GB: "en", US: "en", AU: "en", CA: "en", NZ: "en",
          IE: "en", IN: "en", ZA: "en",
          BE: "fr", LU: "fr", SN: "fr", CI: "fr",
          PE: "es", VE: "es", EC: "es", UY: "es", PY: "es",
          UA: "ru",
        };
        const detected = countryLangMap[data.country_code];
        if (detected && SUPPORTED_LANGS.includes(detected)) {
          setLang(detected);
          localStorage.setItem("unlockr_lang", detected);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changeLanguage = (newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      setLang(newLang);
      localStorage.setItem("unlockr_lang", newLang);
      localStorage.setItem("unlockr_lang_manual", "1");
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang] || translations["en"];

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
