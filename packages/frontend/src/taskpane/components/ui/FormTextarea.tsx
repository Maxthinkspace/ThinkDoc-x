import React, { CSSProperties, useState, useMemo, useRef, useEffect } from "react";

interface FormTextareaProps {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  error?: string;

  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onValueChange?: (value: string) => void;
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  required = false,
  value,
  placeholder,
  error,
  onChange,
  onValueChange,
}) => {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  // prevent showing error on initial load
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  /** -- Validation -------------------------------------- */
  const validationMessage = useMemo(() => {
    if (error) return error;
    // only show required message when the value is empty (trim to ignore whitespace)
    if (required && value.trim() === "") return "Please fill in this field";
    return undefined;
  }, [error, required, value]);

  // show error only after first blur (touched) and after mount
  const showError = mounted.current && touched && !!validationMessage;

  /** -- Change handler ----------------------------------- */
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };

  /** -- Styles ------------------------------------------- */
  const styles: Record<string, CSSProperties> = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      fontFamily: "sans-serif",
    },
    label: {
      fontSize: 14,
      fontWeight: 500,
      color: "#242424",
      marginBottom: 6,
    },
    required: {
      color: "red",
    },
    textarea: {
      padding: "10px 14px",
      fontSize: 14,
      minHeight: "50px",
      borderRadius: 8,
      resize: "vertical",
      border: `1.6px solid ${showError ? "#ff6d6d" : focused ? "#3a82ff" : "#cfcfcf"}`,
      outline: "none",
      transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      color: "#1e1e1e",
    },
    errorText: {
      marginTop: 6,
      marginBottom: 0,
      fontSize: 13,
      color: "#ff4f4f",
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>

      <textarea
        value={value}
        placeholder={placeholder}
        style={styles.textarea}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setTouched(true);
        }}
        aria-invalid={showError ? true : undefined}
        aria-describedby={
          showError ? `${label.replace(/\s+/g, "-").toLowerCase()}-error` : undefined
        }
      />

      {showError && (
        <p id={`${label.replace(/\s+/g, "-").toLowerCase()}-error`} style={styles.errorText}>
          {validationMessage}
        </p>
      )}
    </div>
  );
};

export default FormTextarea;
