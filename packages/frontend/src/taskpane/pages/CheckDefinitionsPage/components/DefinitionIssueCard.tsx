import {
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

type DefinitionIssueCardProps = {
  index: number;
  title: string;
  children: React.ReactNode;
  hideExpandIcon?: boolean;
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
    transition: "opacity 0.2s ease, background-color 0.2s ease, border 0.2s ease",
    width: "100%",
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
  icon: {
    width: "16px",
    height: "16px",
  },
});

export const DefinitionIssueCard: React.FC<DefinitionIssueCardProps> = ({ 
  index, 
  title,
  children,
  hideExpandIcon = false,
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const itemId = `issue-${index}`;

  return (
    <div className={styles.root}>
      <Accordion
        collapsible
        openItems={isExpanded ? [itemId] : []}
        onToggle={(_, data) => {
          setIsExpanded(data.openItems.includes(itemId));
        }}
        style={{ width: "100%" }}
      >
        <AccordionItem value={itemId} className={styles.accordionItem}>
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >
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
              {title}
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
            {children}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

