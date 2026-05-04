import { createContext, useContext, useState, useEffect } from "react";
import { translations, detectLanguage, SUPPORTED_LANGS } from "./i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const manual = localStorage.getItem("unlockr_lang_manual");
    if (manual === "1") {
      const saved = localStorage.getItem("unlockr_lang");
      if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    }
    return detectLanguage();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manual = localStorage.getItem("unlockr_lang_manual");
    if (manual === "1") {
      setLoading(false);
      return;
    }

    setLoading(false);
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
