import React, { useState } from "react";
import { Divider, Button as FButton, makeStyles } from "@fluentui/react-components";
import "./styles/PlaybookGenerator.css";
import { FaChevronUp, FaArrowLeft, FaChevronDown } from "react-icons/fa6";
import { IoMdInformationCircle } from "react-icons/io";
import { useNavigation } from "../../hooks/use-navigation";
import { FaRegCommentDots } from "react-icons/fa";
import { GrStatusInfo } from "react-icons/gr";
import { Button, Tooltip } from "@fluentui/react-components";
import Image from "../../../assets/createplaybook-img.png";
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

export default function EmptyPlaybook({ defaultAccordionOpen = false }: PlaybookGeneratorProps) {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const [accordionOpen, setAccordionOpen] = useState<boolean>(defaultAccordionOpen);
  const [generateDisabled, setGenerateDisabled] = useState(false);

  const toggleAccordion = () => setAccordionOpen((s) => !s);

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
      <div
        style={{
          display: "grid",
          placeContent: "center",
          marginTop: "36px",
          marginBottom: "24px",
        }}
      >
        <img src={Image} alt="PlaybookImg" />
      </div>

      <div
        style={{
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "20px",
          }}
        >
          No playbook is generated from this agreement…
        </p>
        <p>No annotation is detected in this agreement.</p>
      </div>

      <section className="pg-body">
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
        <div
          style={{
            display: "grid",
            placeContent: "center",
          }}
        >
          <FButton
            type="button"
            appearance="primary"
            style={{
              backgroundColor: "#0F62FE",
              padding: "3px 22px 7px 22px",
              borderRadius: "6px",
            }}
          >
            Try Another Documents
          </FButton>
        </div>
      </section>
    </main>
  );
}
