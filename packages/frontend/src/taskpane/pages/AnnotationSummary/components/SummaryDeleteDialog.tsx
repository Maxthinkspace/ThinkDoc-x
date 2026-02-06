import * as React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  makeStyles,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  message: {
    fontSize: '14px',
    color: '#333',
  },
  preview: {
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    padding: '12px',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    color: 'white',
    '&:hover': {
      backgroundColor: '#b71c1c',
    },
  },
});

interface DeleteDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  previewContent?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  title = 'Delete Annotation',
  message = 'Are you sure you want to delete this annotation?',
  previewContent,
  onConfirm,
  onCancel,
}) => {
  const styles = useStyles();

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface>
        <DialogTitle>{title}</DialogTitle>
        <DialogBody>
          <DialogContent className={styles.content}>
            <p className={styles.message}>{message}</p>
            {previewContent && (
              <div className={styles.preview}>
                {previewContent}
              </div>
            )}
          </DialogContent>
        </DialogBody>
        <DialogActions>
          <Button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </Button>
          <Button className={styles.deleteButton} onClick={onConfirm}>
            Delete
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

export default DeleteDialog;