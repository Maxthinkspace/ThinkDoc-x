import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@fluentui/react-components";
import { MdDelete } from "react-icons/md";
interface ConfirmDeleteDialogProps {
  open: boolean;
  ruleNumber: string;
  displayNumber: number; // Visual number to display (1, 2, 3, etc.)
  instruction: string;
  onConfirm: () => void;
  onCancel: () => void;
}
export const DeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  ruleNumber, // Used for deletion logic (not displayed)
  displayNumber,
  instruction,
  onConfirm,
  onCancel,
}) => {
  console.log("ruleNumber: ", ruleNumber);
  return (
    <Dialog open={open}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MdDelete
              style={{
                color: "blue",
                backgroundColor: "#F2F2F2",
                borderRadius: "50%",
                padding: "8px",
              }}
            />
          </DialogTitle>
          <DialogContent>
            <p
              style={{
                fontSize: "17px",
                fontWeight: "600",
                textAlign: "center",
                marginTop: "6px"
              }}
            >
              Are you sure to delete this rule?
            </p>
            <p
              style={{
                margin: 0,
                marginBottom: "8px",
                backgroundColor: "#E6E6E6",
                borderRadius: "8px",
                padding: "10px",
                maxHeight: "6em",
                overflowY: "auto",
                lineHeight: "1.5em",
              }}
            >
              <span
                style={{
                  color: "#0F62FE",
                  fontWeight: "600",
                }}
              >
                Rule {displayNumber}:{" "}
              </span>
              {instruction}
            </p>
          </DialogContent>
          <DialogActions
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: "row",
            }}
          >
            <Button
               style={{
                flex: 1,
                padding: "6px",
                borderRadius: "6px"
              }}
              appearance="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              style={{
                flex: 1,
                background: "var(--brand-gradient)",
                color: "var(--text-on-brand)",
                border: "none",
                padding: "6px",
                borderRadius: "6px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 500,
              }}
              appearance="primary"
              onClick={onConfirm}
            >
              Yes Please
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
