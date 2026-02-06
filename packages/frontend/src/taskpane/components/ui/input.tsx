import React, { CSSProperties, useState, useMemo, useRef, useEffect } from "react";

interface FormInputProps {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  error?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
}

const FormInput: React.FC<FormInputProps> = ({
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

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const validationMessage = useMemo(() => {
    if (error) return error;
    // only complain if required AND value is empty (trim to avoid whitespace)
    if (required && !value?.trim()) return "Please fill in this field";
    return undefined;
  }, [error, required, value]);

  // show error only after initial mount AND after the user has blurred (touched)
  const showError = mounted.current && touched && !!validationMessage;

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };

  const styles: Record<string, CSSProperties> = {
    wrapper: { display: "flex", flexDirection: "column", fontFamily: "sans-serif" },
    label: { fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6 },
    required: { color: "red" },
    input: {
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: 8,
      border: `1.6px solid ${showError ? "#ff6d6d" : focused ? "#3a82ff" : "#cfcfcf"}`,
      outline: "none",
      transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      color: "#1e1e1e",
    },
    errorText: { marginTop: 1, marginBottom: 0, fontSize: 13, color: "#ff4f4f" },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>

      <input
        value={value}
        placeholder={placeholder}
        style={styles.input}
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

export default FormInput;
