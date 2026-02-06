import React from "react";
import "../styles/ClauseCard.css";
import { Eye, Settings, Trash2, Copy, FileText } from "lucide-react";
import { Tooltip } from "@fluentui/react-components";

export interface Clause {
  id: string;
  name: string;
  text: string;
  category?: string;
  tags?: string[];
  description?: string;
  sourceDocument?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  clause: Clause;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

const formatDate = (raw?: string) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

export default function ClauseCard({
  clause,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}: Props) {
  return (
    <article className="clause-card">
      <header className="clause-card-header">
        <p className="clause-title">{clause.name}</p>
        <div className="clause-updated">Last updated: {formatDate(clause.updatedAt || clause.createdAt)}</div>
      </header>

      <section className="clause-metadata">
        {clause.category && (
          <div className="clause-chip">
            <div className="clause-chip-label">Category:</div>
            <div className="clause-chip-value">{clause.category}</div>
          </div>
        )}
        {clause.sourceDocument && (
          <div className="clause-chip">
            <div className="clause-chip-label">Source:</div>
            <div className="clause-chip-value">{clause.sourceDocument}</div>
          </div>
        )}
      </section>

      {clause.description && (
        <p className="clause-desc">{clause.description}</p>
      )}

      <div className="clause-text-preview">
        <FileText size={14} />
        <span>{clause.text.length > 150 ? `${clause.text.substring(0, 150)}...` : clause.text}</span>
      </div>

      <section className="clause-tags">
        {clause.tags && clause.tags.length > 0 ? (
          clause.tags.map((tag, i) => (
            <span key={i} className="clause-tag">
              {tag}
            </span>
          ))
        ) : (
          <span className="clause-tag muted">no tags</span>
        )}
      </section>

      <footer className="clause-actions">
        <div className="clause-action-left">
          <Tooltip content="Delete clause" relationship="label" positioning="above">
            <button className="icon-btn" onClick={() => onDelete?.(clause.id)}>
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>

        <div className="clause-action-right">
          <Tooltip content="View clause" relationship="label" positioning="above">
            <button className="icon-btn" onClick={() => onView?.(clause.id)}>
              <Eye size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Edit clause" relationship="label" positioning="above">
            <button className="icon-btn" onClick={() => onEdit?.(clause.id)}>
              <Settings size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Duplicate clause" relationship="label" positioning="above">
            <button className="icon-btn" onClick={() => onDuplicate?.(clause.id)}>
              <Copy size={18} />
            </button>
          </Tooltip>
        </div>
      </footer>
    </article>
  );
}

