import * as React from "react";
import { makeStyles } from "@fluentui/react-components";
import { AiOutlineExclamationCircle } from "react-icons/ai";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 8px 16px 8px",
    backgroundColor: "#E3E3E3",
  },
  tooltipCard: {
    position: "relative",
    background: "linear-gradient(180deg, #242424 0%, #2b2b2b 100%)",
    color: "#FFFFFF",
    borderRadius: "8px",
    padding: "12px 12px",
    width: "360px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    // bottom caret
    selectors: {
      "&::after": {
        content: '""',
        position: "absolute",
        left: "25px" /* adjust horizontally where caret appears */,
        bottom: "-6px" /* position below card */,
        width: 0,
        height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "10px solid #2b2b2b" /* colour same as card bottom */,
        backgroundColor: "#454545",
      },
    },
  },
  topRow: {
    display: "flex",
    gap: "7px",
    alignItems: "start",
    marginBottom: "6px",
  },

  title: {
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
    color: "#FFFFFF",
  },
  subtitle: {
    margin: 0,
    marginTop: "2px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.66)",
    lineHeight: 1.25,
  },
  // small pointer beneath the caret (optional shadow)
  //   caretShadow: {
  //     position: "absolute",
  //     left: "26px",
  //     bottom: "-6px",
  //     width: "16px",
  //     height: "6px",
  //     borderBottomLeftRadius: "3px",
  //     borderBottomRightRadius: "3px",
  //     background: "#454545",
  //     boxShadow: "0 2px 2px rgba(0,0,0,0.08)",
  //     pointerEvents: "none",
  //   },
  caretShadow: {
        position: "absolute",
    bottom: "-6px",
    left: "35px",
    width: "12px",
    height: "12px",
    background: "#2b2b2b",
    transform: "rotate(45deg)",
  },

  // helper to show the uploaded image (if you want to include it inside card)
  uploadedPreview: {
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    objectFit: "cover",
  },
});

export default function RuleTooltip(): JSX.Element {
  const styles = useStyles();

  return (
    <div className={styles.wrapper}>
      <div className={styles.tooltipCard} role="note" aria-label="Rule Configuration">
        <div className={styles.topRow}>
          <div>
            <AiOutlineExclamationCircle size={17} />
          </div>

          <div style={{ flex: 1 }}>
            <p className={styles.title}>Rule Configuration</p>
            <p className={styles.subtitle}>Please advise if the following rules should apply</p>
          </div>
        </div>

        {/* a subtle shadow element under the caret for depth */}
        <div className={styles.caretShadow} />
      </div>
    </div>
  );
}
