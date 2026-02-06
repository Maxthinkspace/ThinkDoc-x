// ===========================================================================================================
// NOTE 11-27-2025:
// Changes are intended to make "Tabs.tsx" a pure container. Data processing is moved to PlaybookRulesTab.tsx. 
// ===========================================================================================================

import * as React from "react";
import { makeStyles, Divider, Tooltip, Button } from "@fluentui/react-components";
import PlaybookRules from "./components/PlaybookRulesTab";
import { FaArrowLeft, FaPlus } from "react-icons/fa6";
import { useNavigation } from "../../hooks/use-navigation";

// ===========================================================================
// NOTE 11-27-2025:
// Moved NoRulesApplied to PlaybookResultsTab.tsx
// ===========================================================================

// import {NoRulesApplied} from "./components/ChangesTab";

const useStyles = makeStyles({
  root: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    rowGap: "15px",
  },

  // ===========================================================================
  // NOTE 11-27-2025:
  // Moved tab-related styles to PlaybookResultsTab.tsx
  // ===========================================================================

  // panels: {
  //   padding: 0,
  //   "& th": {
  //     textAlign: "left",
  //     padding: "0 30px 0 0",
  //   },
  // },
  // propsTable: {
  //   "& td:first-child": {
  //     fontWeight: tokens.fontWeightSemibold,
  //   },
  //   "& td": {
  //     padding: "0 30px 0 0",
  //   },
  // },
  
   header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 19px 5px 19px",
  },
  headerTitle: {
    margin: "9px",
    fontWeight: 600,
    color: "#333333",
    fontSize: "15px",
  },
  headerIcon: {
    color: "#999999",
    border: "none",
    backgroundColor: "transparent",
    "&:hover": {
      color: "#999999",
      border: "none",
      backgroundColor: "transparent",
    },
  },
});

export const PlaybookRulesTabs = () => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();

  // ===========================================
  // NOTE 11-27-2025:
  // Moved tab selection to PlaybookRulesTab.tsx 
  // ===========================================
  
  // // state to control which panel is visible (minimal change)
  // const [selectedValue, setSelectedValue] = React.useState<TabValue>("rules");

  // const onTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
  //   setSelectedValue(data.value);
  //   console.log(event);
  // };

  // ===========================================
  // NOTE 11-27-2025:
  // Moved tab styling variables to PlaybookRulesTab.tsx 
  // ===========================================
  
  // // small helper styles (inline to avoid changing your makeStyles)
  // const activeTabStyle: React.CSSProperties = {
  //   backgroundColor: "white",
  //   padding: "4px",
  //   fontWeight: 700,
  //   boxShadow: "rgba(0, 0, 0, 0.12) 3px 2px 5px",
  //   flex: 1,
  // };

  // const inactiveTabStyle: React.CSSProperties = {
  //   flex: 1,
  //   padding: "4px",
  // };

  // const activePanelWrapperStyle: React.CSSProperties = {
  //   backgroundColor: "white",
  // };

  // const panelWrapperStyle: React.CSSProperties = {
  //   padding: 0,
  // };

  return (
    <div>
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaArrowLeft />}
            onClick={() => navigateTo("library")}
            className={styles.headerIcon}
          />
        </Tooltip>
        <p className={styles.headerTitle}>Playbook Library</p>
        <Tooltip
          appearance="inverted"
          content="Create new playbook"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaPlus />}
            onClick={() => navigateTo("PlaybookGenerator")}
            className={styles.headerIcon}
          />
        </Tooltip>
      </div>
      <Divider />
      <div style={{ padding: "8px 12px" }}>
        <PlaybookRules />
      </div>
    </div>
  );
};  
