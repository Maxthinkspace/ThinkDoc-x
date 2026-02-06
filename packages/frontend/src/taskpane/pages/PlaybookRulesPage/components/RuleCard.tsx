import {
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { Play } from "lucide-react";

type RuleCardProps = {
  index: number;
  briefName?: string;
  instruction: string;
  example?: string;
  hideExpandIcon?: boolean;
  hidePlayIcon?: boolean;
};

const useStyles = makeStyles({
  root: {
    marginBottom: "1px",
    alignSelf: "stretch",
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
  },
  accordionItem: {
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#F6F6F6",
    marginBottom: "1px",
    cursor: "move",
    transition: "opacity 0.2s ease, background-color 0.2s ease, border 0.2s ease",
    width: "100%",
  },
  draggedItem: {
    opacity: 0.3,
    transform: "rotate(2deg)",
  },
  accordionHeader: {
    backgroundColor: "#F6F6F6",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    maxWidth: "100%",
    overflow: "hidden",
    "&:hover": {
      backgroundColor: "#F6F6F6",
    },
    // remove default fluent accordion trigger indicators (keeps your look)
    "& [data-accordion-trigger]": {
      "&::after": { display: "none !important" },
      "&::before": { display: "none !important" },
    },
  },
  customChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "14px",
  },
  accordionPanel: {
    backgroundColor: "#F6F6F6 !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "8px",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    wordWrap: "break-word",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  },
  example: {
    backgroundColor: "#E6E6E6",
    borderRadius: "8px",
    padding: "8px",
    margin: "5px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "4px",
  },
  icon: {
    width: "16px",
    height: "16px",
  },
});

export const RuleCard: React.FC<RuleCardProps> = ({ 
  index, 
  instruction, 
  example,  
  briefName,
  hideExpandIcon = false,
  hidePlayIcon = false,
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className={styles.root}>
      <Accordion
        collapsible
        openItems={isExpanded ? ["rule"] : []}
        onToggle={(_, data) => {
          setIsExpanded(data.openItems.includes("rule"));
        }}
        style={{ width: "100%" }}
      >
        <AccordionItem value="rule" className={styles.accordionItem}>
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >
            {!hidePlayIcon && (
              <span>
                <Play
                  size={13}
                  style={{
                    marginRight: "9px",
                    marginTop: "7px",
                  }}
                />
              </span>
            )}
            <p className={styles.title} style={{ 
              cursor: "pointer", 
              flex: 1, 
              margin: 0,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              whiteSpace: "normal",
              minWidth: 0,
            }}>
              Rule {index + 1}:
              {briefName && (
                <span style={{ fontStyle: "italic", fontWeight: "normal" }}> {briefName}</span>
              )}
            </p>

            {!hideExpandIcon && (
              <div className={styles.customChevron}>
                {isExpanded ? (
                  <ChevronUp className={styles.icon} />
                ) : (
                  <ChevronDown className={styles.icon} />
                )}
              </div>
            )}
          </AccordionHeader>

          <AccordionPanel className={styles.accordionPanel}>
            <div style={{ marginBottom: "8px" }}>
              <p style={{ fontWeight: 600, margin: 0, marginBottom: "4px" }}>Instruction:</p>
              <p style={{ color: "#5E687A", margin: 0 }}>{instruction}</p>
            </div>
            {example && (
              <div className={styles.example}>
                <p style={{ fontWeight: 500, margin: 0 }}>Example Language:</p>
                <p style={{ margin: 0 }}>{example}</p>
              </div>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};