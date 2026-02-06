import React, { useState } from "react";
import "../styles/PlaybookTooltip.css";
import { AiOutlineExclamationCircle } from "react-icons/ai";

const FULL_TEXT = `Please carefully review and edit your playbook rules if necessary
before finalizing. You can modify instructions, example language,
move rules between categories, or add new rules as needed.`;

const PlaybookExpander: React.FC = () => {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);

  return (
    <div style={{
        padding: "10px",
        backgroundColor: "#E3E3E3"
    }}>
    <div
      className={`expander ${open ? "open" : ""}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      aria-expanded={open}
      aria-label="Review and customize your playbook"
    >
      <div className="expander-inner">
        <span className="expander-icon" aria-hidden>
         <AiOutlineExclamationCircle />
        </span>

        <div className="expander-text">
          <p className="title">Review and customize your playbook</p>

          <div className="content" aria-hidden={!open}>
            <p>{FULL_TEXT}</p>
          </div>
        </div>

        {/* <span className={`chev ${open ? "rot" : ""}`} aria-hidden>
          ▾
        </span> */}
      </div>
    </div>
    </div>
  );
};

export default PlaybookExpander;
