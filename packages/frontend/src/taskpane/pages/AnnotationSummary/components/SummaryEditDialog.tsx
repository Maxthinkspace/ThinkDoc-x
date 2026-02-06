import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Textarea,
  makeStyles,
} from "@fluentui/react-components";
import type { FlattenedSummaryItem } from "../index";

interface SummaryEditDialogProps {
  open: boolean;
  item: FlattenedSummaryItem;
  onSave: (updates: Partial<FlattenedSummaryItem>) => void;
  onCancel: () => void;
  showRecommendation?: boolean;
}

const useStyles = makeStyles({
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px",
  },
  label: {
    fontWeight: 600,
    fontSize: "13px",
    color: "#333",
  },
  textarea: {
    width: "100%",
    minHeight: "80px",
  },
  dialogContent: {
    paddingTop: "8px",
  },
  saveButton: {
    background: 'linear-gradient(135deg, #0F62FE 0%, #0043CE 100%)',
    color: 'white',
    fontWeight: 600,
    border: 'none',
    ':hover': {
      background: 'linear-gradient(135deg, #0043CE 0%, #002D9C 100%)',
    },
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    ':hover': {
      backgroundColor: '#e0e0e0',
    },
  },
});

export const SummaryEditDialog: React.FC<SummaryEditDialogProps> = ({
  open,
  item,
  onSave,
  onCancel,
  showRecommendation = true,
}) => {
  const styles = useStyles();

  // State for substantive fields
  const [changeDescription, setChangeDescription] = React.useState(item.changeDescription || "");
  const [implication, setImplication] = React.useState(item.implication || "");
  const [recommendation, setRecommendation] = React.useState(item.recommendation || "");

  // State for query fields
  const [queryItemsText, setQueryItemsText] = React.useState(
    item.queryItems?.join("\n") || ""
  );

  // Reset state when item changes
  React.useEffect(() => {
    setChangeDescription(item.changeDescription || "");
    setImplication(item.implication || "");
    setRecommendation(item.recommendation || "");
    setQueryItemsText(item.queryItems?.join("\n") || "");
  }, [item]);

  const handleSave = () => {
    if (item.type === "substantive") {
      onSave({
        changeDescription,
        implication,
        ...(showRecommendation && { recommendation }),
      });
    } else {
      onSave({
        queryItems: queryItemsText.split("\n").filter((line) => line.trim() !== ""),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Edit Summary</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            {item.type === "substantive" ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Change Description</label>
                  <Textarea
                    className={styles.textarea}
                    value={changeDescription}
                    onChange={(_, data) => setChangeDescription(data.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Implication</label>
                  <Textarea
                    className={styles.textarea}
                    value={implication}
                    onChange={(_, data) => setImplication(data.value)}
                  />
                </div>
                {showRecommendation && (
                  <div className={styles.field}>
                    <label className={styles.label}>Recommendation</label>
                    <Textarea
                      className={styles.textarea}
                      value={recommendation}
                      onChange={(_, data) => setRecommendation(data.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className={styles.field}>
                <label className={styles.label}>Instruction Requests (one per line)</label>
                <Textarea
                  className={styles.textarea}
                  style={{ minHeight: "120px" }}
                  value={queryItemsText}
                  onChange={(_, data) => setQueryItemsText(data.value)}
                />
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </Button>
            <Button className={styles.saveButton} onClick={handleSave}>
              Save
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default SummaryEditDialog;