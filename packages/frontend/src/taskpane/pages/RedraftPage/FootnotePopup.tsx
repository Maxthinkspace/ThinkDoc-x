import React, { useEffect, useRef } from "react";
import { makeStyles } from "@fluentui/react-components";
import { X } from "lucide-react";
import type { DraftedSentence } from "@/src/types/redraft";

interface FootnotePopupProps {
  sentence: DraftedSentence;
  position: { x: number; y: number };
  onClose: () => void;
}

const useStyles = makeStyles({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  popup: {
    position: "fixed",
    backgroundColor: "#fff",
    border: "1px solid #e1e1e1",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    padding: "12px 16px",
    maxWidth: "300px",
    zIndex: 1001,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  title: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  content: {
    fontSize: "13px",
    color: "#555",
    lineHeight: "1.5",
  },
  badge: {
    display: "inline-block",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
    marginBottom: "8px",
  },
  originalBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
  },
  additionBadge: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
});

export const FootnotePopup: React.FC<FootnotePopupProps> = ({
  sentence,
  position,
  onClose,
}) => {
  const styles = useStyles();
  const popupRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep popup in viewport
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y + 10;

    if (adjustedX + rect.width > viewportWidth - 20) {
      adjustedX = viewportWidth - rect.width - 20;
    }

    if (adjustedY + rect.height > viewportHeight - 20) {
      adjustedY = position.y - rect.height - 10;
    }

    popup.style.left = `${Math.max(10, adjustedX)}px`;
    popup.style.top = `${Math.max(10, adjustedY)}px`;
  }, [position]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        ref={popupRef}
        className={styles.popup}
        style={{ left: position.x, top: position.y + 10 }}
      >
        <div className={styles.header}>
          <h4 className={styles.title}>
            Footnote [{sentence.footnoteNumber}]
          </h4>
          <button className={styles.closeButton} onClick={onClose}>
            <X style={{ width: "14px", height: "14px", color: "#666" }} />
          </button>
        </div>

        <span
          className={`${styles.badge} ${
            sentence.footnoteType === 'original'
              ? styles.originalBadge
              : styles.additionBadge
          }`}
        >
          {sentence.footnoteType === 'original' ? 'From Original' : 'New Addition'}
        </span>

        <div className={styles.content}>
          {sentence.footnoteContent}
        </div>

        {sentence.originalSectionRef && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
            Source: Section {sentence.originalSectionRef}
          </div>
        )}
      </div>
    </>
  );
};