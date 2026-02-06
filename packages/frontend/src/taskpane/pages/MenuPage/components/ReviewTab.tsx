import React from "react";
import "../styles/ReviewTab.css";
import { BookOpen, Scale, BarChart3, FileText, CheckCircle2, Languages, GitBranch } from "lucide-react";
import { useNavigation } from "@/src/taskpane/hooks/use-navigation";
import { PageType } from "@/src/taskpane/hooks/use-navigation";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/src/taskpane/contexts/LanguageContext";

interface ReviewListItem {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  active?: boolean;
  route?: PageType;
  customHandler?: () => void; 
}

export const ReviewTab: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();

  const menuItems: ReviewListItem[] = [
    {
      icon: <BookOpen size={20} />,
      title: translations.dashboard.playbookReview,
      subtitle: translations.dashboard.playbookReviewSubtitle,
      active: true,
      route: "library",
    },
    {
      icon: <FileText size={20} />,
      title: translations.dashboard.precedentReview,
      subtitle: translations.dashboard.precedentReviewSubtitle,
      active: true,
      route: "precedent-comparison",
    },
    {
      icon: <BarChart3 size={20} />,
      title: "Summarize Annotations",
      subtitle: "Executive summary of changes",
      active: true,
      route: "summary-scope",
    },
    {
      icon: <CheckCircle2 size={20} />,
      title: translations.dashboard.checkDefinitions,
      subtitle: translations.dashboard.checkDefinitionsSubtitle,
      active: true,
      route: "check-definitions",
    },
    {
      icon: <Scale size={20} />,
      title: translations.dashboard.negotiation,
      subtitle: translations.dashboard.negotiationSubtitle,
      active: true,
      route: "negotiation",
    },
    {
      icon: <Languages size={20} />,
      title: translations.dashboard.translation,
      subtitle: translations.dashboard.translationSubtitle,
      active: true,
      route: "translation",
    },
    {
      icon: <GitBranch size={20} />,
      title: "Document Versions",
      subtitle: "Save and compare document versions",
      active: true,
      route: "document-versions",
    },
  ];

  return (
    <div
      className="review-tab-container"
    >
      <div className="review-section">
        <div className="analysis-strategy-list">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`analysis-item ${item.active ? "active" : "disabled"}`}
              onClick={() => {
                if (!item.active) return;

                if (item.customHandler) {
                  item.customHandler();
                } else if (item.route) {
                  navigateTo(item.route);
                }
              }}
            >
              <div className="analysis-icon">{item.icon}</div>
              <div className="analysis-text">
                <div className="analysis-title">{item.title}</div>
                <div className="analysis-subtitle">{item.subtitle}</div>
              </div>
              {item.active && <ChevronRight size={16} className="analysis-chevron" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};