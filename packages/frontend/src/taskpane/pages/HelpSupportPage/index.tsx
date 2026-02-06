import * as React from "react";
import { BookOpen, MessageCircle, ChevronRight, Mail, FileQuestion, Shield, FileText } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import "./styles/HelpSupportPage.css";

export const HelpSupportPage: React.FC = () => {
  const { translations } = useLanguage();

  // Helper function to open external links
  const openExternalLink = (url: string) => {
    window.open(url, "_blank");
  };

  // Helper function to open email client
  const openEmailSupport = () => {
    window.location.href = "mailto:support@mythinkspace.ai";
  };

  return (
    <div className="help-support-page">
      <div className="help-support-content">
        {/* RESOURCES Section */}
        <div className="help-support-section">
          <h3 className="help-support-section-label">{translations.setup.resources}</h3>
          <div className="help-support-card">
            <div className="help-support-item" onClick={() => openExternalLink("https://mythinkspace.ai/faq")}>
              <div className="help-support-item-icon">
                <BookOpen size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.userGuide}</div>
                <div className="help-support-item-subtitle">{translations.helpSupport.tutorials}</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
            <div className="help-support-item" onClick={openEmailSupport}>
              <div className="help-support-item-icon">
                <MessageCircle size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.supportChat}</div>
                <div className="help-support-item-subtitle">{translations.helpSupport.concierge247}</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
          </div>
        </div>

        {/* LEGAL & POLICIES Section */}
        <div className="help-support-section">
          <h3 className="help-support-section-label">{translations.helpSupport.legalPolicies}</h3>
          <div className="help-support-card">
            <div className="help-support-item" onClick={() => openExternalLink("https://mythinkspace.ai/faq")}>
              <div className="help-support-item-icon">
                <FileQuestion size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.faq}</div>
                <div className="help-support-item-subtitle">FREQUENTLY ASKED QUESTIONS</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
            <div className="help-support-item" onClick={() => openExternalLink("https://mythinkspace.ai/terms")}>
              <div className="help-support-item-icon">
                <FileText size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.termsOfService}</div>
                <div className="help-support-item-subtitle">TERMS & CONDITIONS</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
            <div className="help-support-item" onClick={() => openExternalLink("https://mythinkspace.ai/privacy")}>
              <div className="help-support-item-icon">
                <Shield size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.privacyPolicy}</div>
                <div className="help-support-item-subtitle">PRIVACY & DATA PROTECTION</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
            <div className="help-support-item" onClick={openEmailSupport}>
              <div className="help-support-item-icon">
                <Mail size={20} />
              </div>
              <div className="help-support-item-info">
                <div className="help-support-item-title">{translations.helpSupport.contactSupport}</div>
                <div className="help-support-item-subtitle">support@mythinkspace.ai</div>
              </div>
              <ChevronRight size={16} className="help-support-item-chevron" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

