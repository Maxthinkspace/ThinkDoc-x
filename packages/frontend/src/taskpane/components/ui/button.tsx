import * as React from "react";
import { Button as FluentButton, mergeClasses } from "@fluentui/react-components";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  primary: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(30px) saturate(200%) brightness(110%)",
    WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    color: "#1a1a1a",
    fontWeight: "600",
    boxShadow: `
      0 6px 24px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      inset 0 -1px 0 rgba(255, 255, 255, 0.2),
      inset 1px 0 0 rgba(255, 255, 255, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.2)
    `,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 4px 10px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        inset 0 -1px 0 rgba(255, 255, 255, 0.3),
        inset 1px 0 0 rgba(255, 255, 255, 0.5),
        inset -1px 0 0 rgba(255, 255, 255, 0.3)
      `,
    },
  },
  outline: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    color: "#495057",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(30px) saturate(200%) brightness(110%)",
      WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%)",
      border: "1px solid rgba(255, 255, 255, 0.4)",
      boxShadow: `
        0 4px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        inset 0 -1px 0 rgba(255, 255, 255, 0.2)
      `,
    },
  },
  small: {
    fontSize: "12px",
    padding: "6px 12px",
    minHeight: "28px",
  },
  medium: {
    fontSize: "14px",
    padding: "8px 16px",
    minHeight: "32px",
  },
  disabled: {
    backgroundColor: "#ccc",
    color: "#666",
    cursor: "not-allowed",
    "&:hover": {
      backgroundColor: "#ccc",
    },
  },
});

interface ButtonProps {
  variant?: "default" | "outline" | "primary";
  size?: "sm" | "md";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = "default", 
  size = "md", 
  children, 
  disabled,
  className,
  onClick,
  style
}) => {
  const styles = useStyles();
  
  const getVariantStyle = () => {
    if (disabled) return styles.disabled;
    switch (variant) {
      case "primary":
        return styles.primary;
      case "outline":
        return styles.outline;
      default:
        return undefined;
    }
  };
  
  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return styles.small;
      case "md":
      default:
        return styles.medium;
    }
  };

  return (
    <FluentButton
      className={mergeClasses(getVariantStyle(), getSizeStyle(), className)}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {children}
    </FluentButton>
  );
};
