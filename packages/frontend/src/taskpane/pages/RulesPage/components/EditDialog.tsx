import * as React from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  makeStyles,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import { SquarePenIcon } from "lucide-react";
import { RiEditFill } from "react-icons/ri";

const useStyles = makeStyles({
  root: {
    marginBottom: "20px",
    border: "0.5px solid #cbcbcbff",
    borderRadius: "4px",
    padding: "16px 10px 36px 36px",
    alignSelf: "stretch",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#898a89ff",
  },
  example: {
    backgroundColor: "#fbfafaff",
    fontStyle: "italic",
    padding: "6px",
    borderRadius: "4px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  icon: {
    width: "16px",
    height: "16px",
  },
  trashIcon: {
    color: "red",
  },
  actionsButton: {
    background: "white",
    border: "1px solid grey",
    cursor: "pointer",
    marginLeft: "3px",
    boxShadow: "none",
    outline: "none",
    transition: "background-color 0.3s, color 0.3s",
    padding: "6px",
    borderRadius: "5px",
    display: "grid",
    placeContent: "center",
    color: "#0F62FE",
    "&:hover": {
      backgroundColor: "#eef3f8ff",
    },
  },
});

export interface EditDialogProps {
  instruction: string;
  briefName?: string;
  shouldShowExample?: boolean;
  example?: string;
  onUpdate: (instruction: string, example?: string, briefName?: string) => void;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  instruction,
  briefName,
  example,
  shouldShowExample = true,
  onUpdate,
}) => {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);
  const [editInstruction, setEditInstruction] = React.useState(instruction);
  const [editExample, setEditExample] = React.useState(example || "");
  const [editBriefName, setEditBriefName] = React.useState(briefName || "");

  React.useEffect(() => {
    setEditInstruction(instruction);
    setEditExample(example || "");
    setEditBriefName(briefName || "");
  }, [instruction, example, briefName, open]);

  const handleUpdate = () => {
    onUpdate(editInstruction, editExample, editBriefName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <Tooltip content="Edit" relationship="label" positioning="above">
        <DialogTrigger disableButtonEnhancement>
          <button className={styles.actionsButton}>
            <SquarePenIcon className={styles.icon} />
          </button>
        </DialogTrigger>
      </Tooltip>
      <DialogSurface>
        <DialogBody>
          <DialogTitle style={{
            display: "flex",
            justifyContent: "center",
          }}>
            <RiEditFill color="blue" style={{
              backgroundColor: "#F0F0F0",
              borderRadius: "50%",
              padding: '10px'
            }} />
          </DialogTitle>
          <DialogContent>
            <label style={{
              paddingBottom: "6px",
              display: "block"
            }}>
              Brief Name
            </label>
            <Field>
              <Input
                value={editBriefName}
                onChange={(e) => setEditBriefName(e.target.value)}
                placeholder="3-8 word summary"
              />
            </Field>

            <label style={{
              paddingBottom: "6px",
              paddingTop: "16px",
              display: "block"
            }}>
              Instruction{" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <Field>
              <Textarea
                rows={3}
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
              />
            </Field>
            {shouldShowExample && (
              <>
                <label style={{
                  paddingBottom: "6px",
                  paddingTop: "16px",
                  display: "block"
                }}>
                  Example Language
                </label>
                <Field>
                  <Textarea
                    rows={3}
                    value={editExample}
                    onChange={(e) => setEditExample(e.target.value)}
                  />
                </Field>
              </>
            )}
          </DialogContent>
          <DialogActions style={{ display: "flex", flexDirection: "row", padding: "5px 15px" }}>
            <DialogTrigger disableButtonEnhancement>
              <Button
                style={{
                  flex: 1,
                  borderRadius: "6px"
                }}
                appearance="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </DialogTrigger>
            <Button
              style={{
                flex: 1,
                borderRadius: "6px",
                background: "var(--brand-gradient)",
                color: "var(--text-on-brand)",
                border: "none",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 500,
              }}
              appearance="primary"
              onClick={handleUpdate}
            >
              Update Rule
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};