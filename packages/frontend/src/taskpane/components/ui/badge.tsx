import * as React from "react";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    color: "#333",
    border: "1px solid #e1e1e1",
  },
  success: {
    backgroundColor: "#d4edda",
    color: "#155724",
    border: "1px solid #c3e6cb",
  },
  warning: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    border: "1px solid #ffeaa7",
  },
  error: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    border: "1px solid #f5c6cb",
  },
});

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className }) => {
  const styles = useStyles();
  
  const getVariantStyle = () => {
    switch (variant) {
      case "success":
        return styles.success;
      case "warning":
        return styles.warning;
      case "error":
        return styles.error;
      default:
        return "";
    }
  };

  return (
    <span className={`${styles.badge} ${getVariantStyle()} ${className || ""}`}>
      {children}
    </span>
  );
};
