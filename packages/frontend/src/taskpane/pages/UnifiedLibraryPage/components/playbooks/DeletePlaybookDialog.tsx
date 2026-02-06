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

interface DeletePlaybookDialogProps {
  open: boolean;
  playbookName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeletePlaybookDialog: React.FC<DeletePlaybookDialogProps> = ({
  open,
  playbookName,
  onConfirm,
  onCancel,
}) => {
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
                fontSize: "24px",
              }}
            />
          </DialogTitle>
          <DialogContent>
            <p
              style={{
                fontSize: "17px",
                fontWeight: "600",
                textAlign: "center",
                marginTop: "6px",
                marginBottom: "16px",
              }}
            >
              Are you sure to delete this playbook?
            </p>
            <p
              style={{
                margin: 0,
                backgroundColor: "#E6E6E6",
                borderRadius: "8px",
                padding: "12px",
                textAlign: "center",
                fontWeight: "600",
                color: "#0F62FE",
              }}
            >
              {playbookName}
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
                borderRadius: "6px",
              }}
              appearance="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="brand-btn"
              style={{
                flex: 1,
                background: "var(--brand-gradient)",
                color: "var(--text-on-brand)",
                border: "none",
                padding: "6px",
                borderRadius: "6px",
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