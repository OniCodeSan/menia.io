import { createContext, useContext, useState, useEffect } from "react";
import { translations, detectLanguage, SUPPORTED_LANGS } from "./i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initLang() {
      // Check localStorage first (user override)
      const saved = localStorage.getItem("unlockr_lang");
      if (saved && SUPPORTED_LANGS.includes(saved)) {
        setLang(saved);
        setLoading(false);
        return;
      }

      // Try IP-based detection via free API
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        const countryLangMap = {
          IT: "it", FR: "fr", DE: "de", AT: "de", CH: "de",
          ES: "es", MX: "es", AR: "es", CO: "es", CL: "es",
          RU: "ru", BY: "ru", KZ: "ru",
          GB: "en", US: "en", AU: "en", CA: "en", NZ: "en",
          BE: "fr", LU: "fr",
        };
        const detected = countryLangMap[data.country_code];
        if (detected) {
          setLang(detected);
          setLoading(false);
          return;
        }
      } catch {
        // fallback to browser language
      }

      // Fallback to browser language
      setLang(detectLanguage());
      setLoading(false);
    }

    initLang();
  }, []);

  const changeLanguage = (newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      setLang(newLang);
      localStorage.setItem("unlockr_lang", newLang);
    }
  };

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