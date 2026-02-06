import * as React from "react";
import { Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, Button } from "@fluentui/react-components";
import { useLanguage } from "../../../contexts/LanguageContext";

interface DeleteClauseDialogProps {
  open: boolean;
  clauseName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteClauseDialog: React.FC<DeleteClauseDialogProps> = ({
  open,
  clauseName,
  onConfirm,
  onCancel,
}) => {
  const { translations } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface>
        <DialogTitle>
          {translations.clauseLibrary?.deleteClause || "Delete Clause"}
        </DialogTitle>
        <DialogBody>
          <p>
            {translations.clauseLibrary?.deleteClauseConfirm || "Are you sure you want to delete"} "{clauseName}"?
            {translations.clauseLibrary?.deleteClauseWarning || " This action cannot be undone."}
          </p>
        </DialogBody>
        <DialogActions>
          <Button appearance="secondary" onClick={onCancel}>
            {translations.common.cancel}
          </Button>
          <Button appearance="primary" onClick={onConfirm}>
            {translations.common.delete}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

