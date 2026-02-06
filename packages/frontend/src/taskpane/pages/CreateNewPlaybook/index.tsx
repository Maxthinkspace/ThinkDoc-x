import React, { useState, useEffect } from "react";
import { Divider, Button as FButton, makeStyles } from "@fluentui/react-components";
import "./styles/PlaybookGenerator.css";
import { FaChevronUp, FaArrowLeft, FaChevronDown } from "react-icons/fa6";
import { IoMdInformationCircle } from "react-icons/io";
import { useNavigation } from "../../hooks/use-navigation";
import { FaRegCommentDots } from "react-icons/fa";
import { GrStatusInfo } from "react-icons/gr";
import { Button, Tooltip } from "@fluentui/react-components";
import { PlaybookProgressModal } from "./components/PlaybookProgressModal";

const useStyles = makeStyles({
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
    flex: 1,
    display: "flex",
    justifyContent: "center",
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
export interface PlaybookGeneratorProps {
  onGenerate?: () => void;
  defaultAccordionOpen?: boolean;
}

export default function PlaybookGenerator({
  onGenerate,
  defaultAccordionOpen = false,
}: PlaybookGeneratorProps) {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const [accordionOpen, setAccordionOpen] = useState<boolean>(defaultAccordionOpen);
  const [generateDisabled, setGenerateDisabled] = useState(false);
  const [hasComments, setHasComments] = useState<boolean>(true);
  const [hasHighlights, setHasHighlights] = useState<boolean>(true);
  const [hasTrackChanges, setHasTrackChanges] = useState<boolean>(true);

  const toggleAccordion = () => setAccordionOpen((s) => !s);

  const handleGenerate = async () => {
    // simple guard to prevent double clicks
    if (generateDisabled) return;
    setGenerateDisabled(true);
    try {
      await Promise.resolve(onGenerate?.());
    } finally {
      // keep disabled briefly to avoid double submissions; adjust logic as needed
      setTimeout(() => setGenerateDisabled(false), 700);
    }
  };

  return (
    <main className="pg-root" role="main" aria-labelledby="pg-heading">
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
            onClick={() => navigateTo("menu")}
            className={styles.headerIcon}
          />
        </Tooltip>

        <p className={styles.headerTitle}>Playbook Generator</p>
      </div>
     <Divider />
      <section className="pg-body">
        <p className="pg-intro">Generate custom playbooks from your precedent agreements</p>

        <div className="pg-tip" role="region" aria-label="Tip">
          <div className="pg-tip-icon">
            <IoMdInformationCircle size={18} />
          </div>
          <div className="pg-tip-body">
            <strong>Tip</strong>
            <p>
              To improve the accuracy of your playbook, you need to annotate your precedent
              agreements using comments, track changes, and/or color highlights. These annotations
              help us understand your intent and convert it into precise playbook rules.
            </p>
          </div>
        </div>

        <div className="pg-accordion" aria-expanded={accordionOpen}>
          <button
            className="pg-accordion-toggle"
            onClick={toggleAccordion}
            aria-controls="pg-accordion-panel"
            aria-expanded={accordionOpen}
            type="button"
          >
            <span className="pg-acc-icon" aria-hidden>
              {accordionOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
            </span>
            <span>Learn more: How annotations contribute to playbook generation</span>
          </button>

          <div
            id="pg-accordion-panel"
            className={`pg-accordion-panel ${accordionOpen ? "open" : ""}`}
            role="region"
            aria-hidden={!accordionOpen}
          >
            <div className="pg-info-cards">
              <article className="pg-card">
                <div className="pg-card-icon">
                  <FaRegCommentDots size={20} />
                </div>
                <div>
                  <h3>Comments</h3>
                  <p className="muted">
                    Especially useful when they contain drafting instructions or explanations. These
                    are directly translated into playbook rules.
                  </p>
                </div>
              </article>

              <article className="pg-card">
                <div className="pg-card-icon">
                  <IoMdInformationCircle size={20} />
                </div>
                <div>
                  <h3>Track Changes</h3>
                  <p className="muted">
                    We analyze the proposed changes and infer the underlying rationale to generate
                    corresponding playbook rules.
                  </p>
                </div>
              </article>

              <article className="pg-card">
                <div className="pg-card-icon">
                  <GrStatusInfo size={20} />
                </div>
                <div>
                  <h3>Highlights</h3>
                  <p className="muted">
                    We treat highlighted language as your preferred sample language and incorporate
                    it into the playbook as example clauses.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="pg-cta-border">
          <div className="pg-cta" role="region" aria-label="Generate playbook">
            <div className="pg-cta-text">
              Are you sure the current document is annotated and ready to be converted into a
              playbook?
            </div>

            <div className="pg-cta-actions">
              <PlaybookProgressModal
                handleGenerate={handleGenerate}
                generateDisabled={generateDisabled}
              />
              {/* <button
                className="pg-generate-btn"
                onClick={handleGenerate}
                disabled={generateDisabled}
                aria-disabled={generateDisabled}
                type="button"
              >
                Generate
              </button> */}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
