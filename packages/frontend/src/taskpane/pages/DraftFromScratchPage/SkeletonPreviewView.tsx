import * as React from "react";
import { makeStyles, Button as FButton, Checkbox } from "@fluentui/react-components";
import { ArrowLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { SkeletonSection } from "./types";
import "./styles/DraftFromScratchPage.css";

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    gap: "16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
  },
  section: {
    marginBottom: "16px",
  },
  sectionItem: {
    padding: "12px",
    backgroundColor: "#fff",
    border: "1px solid #e1e1e1",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  sectionNumber: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#4f8bd4",
    minWidth: "30px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
    flex: 1,
  },
  sectionDescription: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px",
    marginLeft: "42px",
  },
  expandButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    color: "#666",
  },
  childrenContainer: {
    marginLeft: "42px",
    marginTop: "8px",
  },
  lengthBadge: {
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    color: "#666",
    marginLeft: "8px",
  },
  lengthBadgeShort: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  lengthBadgeMedium: {
    backgroundColor: "#fff3e0",
    color: "#e65100",
  },
  lengthBadgeLong: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
  infoText: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "16px",
    padding: "12px",
    backgroundColor: "#f5f5f5",
    borderRadius: "6px",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    display: "flex",
    gap: "12px",
  },
  footerButton: {
    flex: 1,
  },
});

interface SkeletonPreviewViewProps {
  skeleton: SkeletonSection[];
  onSkeletonChange: (skeleton: SkeletonSection[]) => void;
  onProceedToDraft: () => void;
  onEditInstructions: () => void;
  isLoading: boolean;
}

const SkeletonSectionItem: React.FC<{
  section: SkeletonSection;
  level: number;
  onToggle: (id: string) => void;
  onToggleInclude: (id: string) => void;
}> = ({ section, level, onToggle, onToggleInclude }) => {
  const styles = useStyles();
  const [expanded, setExpanded] = React.useState(level === 0);

  const hasChildren = section.children && section.children.length > 0;
  const lengthBadgeClass = section.estimatedLength === 'short' 
    ? styles.lengthBadgeShort 
    : section.estimatedLength === 'medium' 
    ? styles.lengthBadgeMedium 
    : styles.lengthBadgeLong;

  return (
    <div className={styles.sectionItem}>
      <div className={styles.sectionHeader}>
        {hasChildren && (
          <button
            className={styles.expandButton}
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && <div style={{ width: "20px" }} />}
        <Checkbox
          checked={section.included}
          onChange={() => onToggleInclude(section.id)}
          label=""
        />
        <div className={styles.sectionNumber}>{section.sectionNumber}</div>
        <div className={styles.sectionTitle}>{section.title}</div>
        <span className={`${styles.lengthBadge} ${lengthBadgeClass}`}>
          {section.estimatedLength}
        </span>
      </div>
      {section.description && (
        <div className={styles.sectionDescription}>{section.description}</div>
      )}
      {hasChildren && expanded && (
        <div className={styles.childrenContainer}>
          {section.children!.map((child) => (
            <SkeletonSectionItem
              key={child.id}
              section={child}
              level={level + 1}
              onToggle={onToggle}
              onToggleInclude={onToggleInclude}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SkeletonPreviewView: React.FC<SkeletonPreviewViewProps> = ({
  skeleton,
  onSkeletonChange,
  onProceedToDraft,
  onEditInstructions,
  isLoading,
}) => {
  const styles = useStyles();

  const toggleSectionInclude = (id: string) => {
    const updateSection = (section: SkeletonSection): SkeletonSection => {
      if (section.id === id) {
        return { ...section, included: !section.included };
      }
      if (section.children) {
        return {
          ...section,
          children: section.children.map(updateSection),
        };
      }
      return section;
    };

    onSkeletonChange(skeleton.map(updateSection));
  };

  const includedCount = React.useMemo(() => {
    const countIncluded = (sections: SkeletonSection[]): number => {
      return sections.reduce((count, section) => {
        let sectionCount = section.included ? 1 : 0;
        if (section.children) {
          sectionCount += countIncluded(section.children);
        }
        return count + sectionCount;
      }, 0);
    };
    return countIncluded(skeleton);
  }, [skeleton]);

  const totalCount = React.useMemo(() => {
    const countAll = (sections: SkeletonSection[]): number => {
      return sections.reduce((count, section) => {
        let sectionCount = 1;
        if (section.children) {
          sectionCount += countAll(section.children);
        }
        return count + sectionCount;
      }, 0);
    };
    return countAll(skeleton);
  }, [skeleton]);

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={onEditInstructions}
          disabled={isLoading}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Edit Instructions
        </Button>
        <h1 className={styles.title}>Review Document Outline</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.infoText}>
          Review the proposed document structure below. Uncheck any sections you don't want to include in the draft. 
          You can expand sections to see subsections. {includedCount} of {totalCount} sections selected.
        </div>

        {skeleton.map((section) => (
          <SkeletonSectionItem
            key={section.id}
            section={section}
            level={0}
            onToggle={() => {}}
            onToggleInclude={toggleSectionInclude}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <FButton
          appearance="secondary"
          onClick={onEditInstructions}
          disabled={isLoading}
          className={styles.footerButton}
        >
          Edit Instructions
        </FButton>
        <FButton
          appearance="primary"
          onClick={onProceedToDraft}
          disabled={isLoading || includedCount === 0}
          className={styles.footerButton}
        >
          Proceed to Draft ({includedCount} sections)
        </FButton>
      </div>
    </div>
  );
};

