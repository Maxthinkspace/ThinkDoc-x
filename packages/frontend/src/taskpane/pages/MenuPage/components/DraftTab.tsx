import React from "react";
import "../styles/ReviewTab.css";
import { PenTool, Globe, EyeOff, ListChecks, MessageSquare, Grid3x3 } from "lucide-react";
import { useLanguage } from "@/src/taskpane/contexts/LanguageContext";
import type { ActionId, ActionItem } from "./DraftPanel/types";
import { ActionSection } from "./DraftPanel/ActionSection";

interface DraftTabProps {
  analysisAvailable?: boolean;
  onAction: (id: ActionId) => void;
}

export const DraftTab: React.FC<DraftTabProps> = ({
  analysisAvailable = false,
  onAction,
}) => {
  const { translations } = useLanguage();

  // CREATE LANGUAGE section - always enabled
  const createLanguageItems: ActionItem[] = [
    {
      id: "draft_from_scratch",
      title: translations.dashboard.draftFromScratch,
      description: translations.dashboard.draftFromScratchSubtitle,
      group: "create_language",
      icon: <PenTool size={20} />,
      enabled: true,
    },
    {
      id: "redomicile",
      title: translations.dashboard.redomicile,
      description: translations.dashboard.redomicileSubtitle,
      group: "create_language",
      icon: <Globe size={20} />,
      enabled: true,
    },
    {
      id: "redaction",
      title: translations.dashboard.redaction,
      description: translations.dashboard.redactionSubtitle,
      group: "create_language",
      icon: <EyeOff size={20} />,
      enabled: true,
    },
  ];

  // CREATE ANALYSIS section - disabled when no analysis available
  const createAnalysisItems: ActionItem[] = [
    {
      id: "generate_issue_list",
      title: translations.dashboard.generateIssueList,
      description: translations.dashboard.generateIssueListSubtitle,
      group: "create_analysis",
      icon: <ListChecks size={20} />,
      enabled: analysisAvailable,
      disabledReason: analysisAvailable
        ? undefined
        : translations.dashboard.disabledReasonRunReviewFirst,
    },
    {
      id: "summarize_negotiation_positions",
      title: translations.dashboard.summarizeNegotiationPositions,
      description: translations.dashboard.summarizeNegotiationPositionsSubtitle,
      group: "create_analysis",
      icon: <MessageSquare size={20} />,
      enabled: analysisAvailable,
      disabledReason: analysisAvailable
        ? undefined
        : translations.dashboard.disabledReasonRunReviewFirst,
    },
  ];

  // AUTOMATE section - always enabled
  const automateItems: ActionItem[] = [
    {
      id: "form_filler",
      title: translations.dashboard.formFiller,
      description: translations.dashboard.formFillerSubtitle,
      group: "automate",
      icon: <Grid3x3 size={20} />,
      enabled: true,
    },
  ];

  return (
    <div className="review-tab-container">
      <ActionSection
        title="CREATE LANGUAGE"
        items={createLanguageItems}
        onAction={onAction}
      />
      <ActionSection
        title="CREATE ANALYSIS"
        items={createAnalysisItems}
        onAction={onAction}
      />
      <ActionSection
        title="AUTOMATE"
        items={automateItems}
        onAction={onAction}
      />
    </div>
  );
};
