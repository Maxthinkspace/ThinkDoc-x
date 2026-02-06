import React from "react";
import "../styles/RedactAlert.css";

export interface RedactAlertProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  // optional override text
  text?: string;
}

export const RedactAlert: React.FC<RedactAlertProps> = ({
  checked = false,
  onChange,
  text = "Redact document for confidentiality",
}) => {
  const [isOn, setIsOn] = React.useState<boolean>(checked);

  React.useEffect(() => {
    setIsOn(checked);
  }, [checked]);

  const toggle = () => {
    const next = !isOn;
    setIsOn(next);
    onChange?.(next);
  };

  return (
    <div className="ra-banner" role="region" aria-label="confidentiality alert">
      <div className="ra-left">
        <span className="ra-icon" aria-hidden="true">
          {/* orange circle with exclamation */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="12" r="11" fill="#FF9F1C"/>
            <rect x="11.2" y="6" width="1.6" height="7" rx="0.8" fill="white"/>
            <circle cx="12" cy="16.4" r="1.15" fill="white"/>
          </svg>
        </span>

        <span className="ra-text">{text}</span>
      </div>

      <button
        type="button"
        className={`ra-switch ${isOn ? "ra-switch-on" : ""}`}
        onClick={toggle}
        aria-pressed={isOn}
        aria-label={isOn ? "Disable redaction" : "Enable redaction"}
      >
        <span className="ra-switch-track">
          <span className="ra-switch-thumb" />
        </span>
      </button>
    </div>
  );
};

export default RedactAlert;
