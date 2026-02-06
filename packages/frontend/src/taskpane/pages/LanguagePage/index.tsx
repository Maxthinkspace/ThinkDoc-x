import * as React from "react";
import { ChevronLeft, Globe, Check } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { LanguageCode } from "../../utils/translations";
import "./styles/LanguagePage.css";

interface Language {
  code: LanguageCode;
  nameKey: "english" | "chinese" | "spanish" | "french" | "japanese" | "german";
}

const LANGUAGES: Language[] = [
  { code: "en", nameKey: "english" },
  { code: "zh", nameKey: "chinese" },
  { code: "es", nameKey: "spanish" },
  { code: "fr", nameKey: "french" },
  { code: "ja", nameKey: "japanese" },
  { code: "de", nameKey: "german" },
];

export const LanguagePage: React.FC = () => {
  const { goBack } = useNavigation();
  const { language: currentLanguage, setLanguage, translations } = useLanguage();

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    // Small delay to allow state update before navigating back
    setTimeout(() => {
      goBack();
    }, 100);
  };

  return (
    <div className="language-page">
      {/* Header */}
      <div className="language-header">
        <button className="language-back-button" onClick={goBack} aria-label={translations.common.back}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="language-title">{translations.language.title}</h1>
      </div>

      {/* Language List */}
      <div className="language-content">
        <div className="language-card">
          {LANGUAGES.map((language) => {
            const isSelected = currentLanguage === language.code;
            const languageName = translations.language[language.nameKey];
            return (
              <div
                key={language.code}
                className={`language-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleLanguageSelect(language.code)}
              >
                <div className={`language-icon-container ${isSelected ? "selected" : ""}`}>
                  <Globe size={20} />
                </div>
                <div className="language-name">{languageName}</div>
                {isSelected && (
                  <div className="language-check">
                    <Check size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

