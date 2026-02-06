import * as React from "react";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  card: {
    backgroundColor: "#fff",
    border: "1px solid #e1e1e1",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px 0 20px",
  },
  content: {
    padding: "16px 20px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 8px 0",
    color: "#333",
  },
});

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className, style }) => {
  const styles = useStyles();
  return <div className={`${styles.card} ${className || ""}`} style={style}>{children}</div>;
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, style }) => {
  const styles = useStyles();
  return <div className={`${styles.header} ${className || ""}`} style={style}>{children}</div>;
};

export const CardContent: React.FC<CardContentProps> = ({ children, className, style }) => {
  const styles = useStyles();
  return <div className={`${styles.content} ${className || ""}`} style={style}>{children}</div>;
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, style }) => {
  const styles = useStyles();
  return <h3 className={`${styles.title} ${className || ""}`} style={style}>{children}</h3>;
};
