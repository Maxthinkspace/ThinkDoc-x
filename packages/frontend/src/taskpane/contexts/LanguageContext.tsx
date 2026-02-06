import * as React from "react";
import {
  LanguageCode,
  getStoredLanguage,
  setStoredLanguage,
  getTranslations,
  Translations,
} from "../utils/translations";

interface LanguageContextType {
  language: LanguageCode;
  translations: Translations;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = React.useState<LanguageCode>(getStoredLanguage());
  const [translations, setTranslations] = React.useState<Translations>(getTranslations(language));

  const setLanguage = React.useCallback((lang: LanguageCode) => {
    setStoredLanguage(lang);
    setLanguageState(lang);
    setTranslations(getTranslations(lang));
    // Force re-render by updating a key or triggering a state update
    window.dispatchEvent(new Event("languagechange"));
  }, []);

  // Listen for language changes from other tabs/components
  React.useEffect(() => {
    const handleLanguageChange = () => {
      const newLang = getStoredLanguage();
      if (newLang !== language) {
        setLanguageState(newLang);
        setTranslations(getTranslations(newLang));
      }
    };

    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, translations, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

