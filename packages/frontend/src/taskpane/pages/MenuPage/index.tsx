import { makeStyles, tokens, Tab, TabList } from "@fluentui/react-components";
import type { SelectTabData, SelectTabEvent, TabValue } from "@fluentui/react-components";
import * as React from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { ReviewTab } from "./components/ReviewTab";
import { DraftTab } from "./components/DraftTab";
import { useLanguage } from "../../contexts/LanguageContext";
import type { ActionId } from "./components/DraftPanel/types";
type MenuPageProps = {
  // No longer needed as we use useNavigation hook
};

const useStyles = makeStyles({
  root: {
    padding: "16px",
    position: "relative",
    minHeight: "100vh",
  },
  header: {
    padding: "16px 30px",
    borderBottom: "0.5px solid #ccc",
  },
  h1: {
    fontSize: "24px",
  },
  p: {
    fontSize: "16px",
    color: "#666",
  },
  tabList: {
    padding: "4px",
    marginBottom: "0px",
    width: "100%",
    backgroundColor: "#f9f6f6ff",
    borderRadius: "3px",
    display: "flex",
    alignItems: "center",
    justifyItems: "center",
    gap: "4px",

    "& .fui-Tab__content": {
      textDecoration: "none !important",
    },
  },
  tab: {
    textTransform: "none",
    flexGrow: 1,
    padding: "4px 8px",
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: "none",
    position: "relative",
    fontSize: "12px",

    // 去掉hover背景颜色 - 使用更具体的选择器
    "&[aria-selected='true']:hover": {
      background: "rgba(255, 255, 255, 0.2) !important",
      backdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
      WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
      border: "1px solid rgba(255, 255, 255, 0.3) !important",
      boxShadow: `
        0 6px 24px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        inset 0 -1px 0 rgba(255, 255, 255, 0.3),
        inset 1px 0 0 rgba(255, 255, 255, 0.5),
        inset -1px 0 0 rgba(255, 255, 255, 0.3)
      !important`,
    },

    // 选中状态样式 - Glass effect
    "&[aria-selected='true']": {
      background: "rgba(255, 255, 255, 0.15) !important",
      backdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
      WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
      border: "1px solid rgba(255, 255, 255, 0.3) !important",
      boxShadow: `
        0 4px 16px rgba(0, 0, 0, 0.1),
        0 1px 4px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        inset 0 -1px 0 rgba(255, 255, 255, 0.2),
        inset 1px 0 0 rgba(255, 255, 255, 0.4),
        inset -1px 0 0 rgba(255, 255, 255, 0.2)
      !important`,
      color: "#1a1a1a !important",
      fontWeight: "600 !important",
    },

    // 确保所有伪元素都不显示下划线
    "&::after, &::before": {
      display: "none !important",
    },
  },
  tabPanels: {},

  navButton: {
    width: "100%",
    padding: "15px 20px",
    background: "none",
    border: "1px solid #f8f6f6ff",
    cursor: "pointer",
    marginLeft: "3px",
    marginBottom: "10px",
    boxShadow: "none",
    outline: "none",
    transition: "background-color 0.3s, color 0.3s",
    borderRadius: "4px",
    color: "#707070ff",
    fontSize: "14px",
    "&:hover": {
      backgroundColor: "#dae9f6ff",
    },
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    width: "100%",
    marginBottom: "10px",
    alignItems: "stretch",
  },

  navButtonOutline: {
    flex: 1,
    padding: "10px 16px",
    background: "white",
    border: "1px solid #EEEFF1",
    cursor: "pointer",
    display: "flex",
    justifyContent: "start",
    alignItems: "center",
    gap: "8px",
    borderRadius: "8px",
    color: "#000000cc",
    fontSize: "14px",
  },

  iconColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
  },

  starButton: {
    width: "40px",
    height: "40px",
    padding: "0",
    background: "#fbfdff",
    border: "1px solid #dfebff",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "8px",
    color: "#5b7eff",
    boxShadow: "0px 0px 16px rgba(0,0,0,0.04)",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },

  tabBarRow: {
    display: "flex",
    gap: "10px",
    width: "100%",
    marginBottom: "10px",
    alignItems: "center",
  },

  historyButton: {
    width: "40px",
    height: "40px",
    padding: "0",
    background: "white",
    border: "1px solid #EEEFF1",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "8px",
    color: "#666",
    boxShadow: "0px 0px 16px rgba(0,0,0,0.04)",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },

  disabledButton: {
    opacity: 0.7,
    color: "#999 !important",
    "&:hover": {
      backgroundColor: "#fff !important",
    },
  },

  icon: {
    width: "16px",
    height: "16px",
    color: "#666ff6",
  },
});

export const MenuPage: React.FC<MenuPageProps> = () => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();
  const [selectedValue, setSelectedValue] = React.useState<TabValue>("Review");
  const [showHistory, setShowHistory] = React.useState(false);

  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };

  React.useEffect(() => {
  }, [selectedValue]);

  const handleDraftAction = (id: ActionId) => {
    
    // Route to appropriate page based on action ID
    // TODO: Implement actual routing when pages are ready
    switch (id) {
      case "draft_from_scratch":
        navigateTo("draft-from-scratch");
        break;
      case "redomicile":
        navigateTo("redomicile");
        break;
      case "redaction":
        navigateTo("redaction");
        break;
      case "generate_issue_list":
        // navigateTo("generate-issue-list");
        break;
      case "summarize_negotiation_positions":
        // navigateTo("summarize-positions");
        break;
      case "form_filler":
        // navigateTo("form-filler");
        break;
      default:
        console.log("Action not yet implemented:", id);
    }
  };

  return (
    <div className={styles.root}>
      {/* Tab Bar */}
      <div className={styles.tabBarRow}>
        <TabList className={styles.tabList} selectedValue={selectedValue} onTabSelect={onTabSelect}>
          <Tab className={styles.tab} id="Review" value="Review">
            {translations.dashboard.review}
          </Tab>
          <Tab className={styles.tab} id="Draft" value="Draft">
            {translations.dashboard.draft}
          </Tab>
        </TabList>
      </div>

      <div className={styles.tabPanels}>
        {selectedValue === "Review" && <ReviewTab />}
        {selectedValue === "Draft" && (
          <DraftTab
            analysisAvailable={false}
            onAction={handleDraftAction}
          />
        )}
      </div>
    </div>
  );
};
