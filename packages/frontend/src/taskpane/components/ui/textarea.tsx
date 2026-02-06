import * as React from "react";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  textarea: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    lineHeight: "1.5",
    border: "1px solid #e1e1e1",
    borderRadius: "4px",
    backgroundColor: "#fff",
    color: "#495057",
    resize: "vertical",
    fontFamily: "inherit",
    ":focus": {
      outline: "none",
      // borderColor: "#4f8bd4",
      boxShadow: "0 0 0 2px rgba(79, 139, 212, 0.2)",
    },
    ":disabled": {
      backgroundColor: "#f8f9fa",
      color: "#6c757d",
      cursor: "not-allowed",
    },
  },
  error: {
    // borderColor: "#dc3545",
    ":focus": {
      // borderColor: "#dc3545",
      boxShadow: "0 0 0 2px rgba(220, 53, 69, 0.2)",
    },
  },
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Textarea: React.FC<TextareaProps> = ({ 
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  error,
  className,
  style,
  ...props 
}) => {
  const styles = useStyles();
  
  return (
    <textarea
      className={`${styles.textarea} ${error ? styles.error : ""} ${className || ""}`}
      style={style}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      {...props}
    />
  );
};
