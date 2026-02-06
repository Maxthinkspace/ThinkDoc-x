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
  makeStyles,
  Textarea,
} from "@fluentui/react-components";
import { FaBell } from "react-icons/fa6";
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
    "&:hover": {
      backgroundColor: "#eef3f8ff",
    },
  },
});



export const UnsavedDialog: React.FC = () => {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <button className={styles.actionsButton}>
          <FaBell className={styles.icon} />
        </button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <FaBell
              color="blue"
              style={{
                backgroundColor: "#F0F0F0",
                borderRadius: "50%",
                padding: "10px",
              }}
            />
          </DialogTitle>
          <DialogContent style={{
            textAlign: "center"
          }}>
            <p style={{
                fontWeight: 600
            }}>You have unsaved changes.</p>
            <p>
              Are you sure you want to leave this page? Any unsaved changes will be lost permanently
              and cannot be recovered.
            </p>
          </DialogContent>
          <DialogActions style={{ display: "flex", flexDirection: "row", padding: "5px 15px" }}>
            <DialogTrigger disableButtonEnhancement>
              <Button
                style={{
                  flex: 1,
                  borderRadius: "6px",
                  fontSize: "13px"
                }}
                appearance="secondary"
                onClick={() => setOpen(false)}
              >
                Leave Anyway
              </Button>
            </DialogTrigger>
            <Button
              style={{
                flex: 1,
                borderRadius: "6px",
                 fontSize: "13px"
              }}
              appearance="primary"
            >
              Stay Here
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
