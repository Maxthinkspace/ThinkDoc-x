import React from "react";
import "../../styles/PlaybookCard.css";
// =======ADDING PLAYBOOK COMBINATION========
import { Copy, Play, Eye, Settings, Check, Trash2 } from "lucide-react";
// =======END OF ADDING PLAYBOOK COMBINATION=====
import { Tooltip } from "@fluentui/react-components";

export interface Playbook {
  id: string | number;
  title: string;
  updatedAt?: string;
  type?: string;
  position?: string;
  jurisdiction?: string;
  description?: string;
  tags?: string[];
  rules?: any[];
}

interface Props {
  playbook: Playbook;
  onUse?: (id: string | number) => void;
  onBrowse?: (id: string | number) => void;
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onDuplicate?: (id: string | number) => void;
  // =======ADDING PLAYBOOK COMBINATION========
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string | number, selected: boolean) => void;
  // =======END OF ADDING PLAYBOOK COMBINATION=====
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

export default function PlaybookCard({
  playbook,
  onUse,
  onBrowse,
  onEdit,
  onDelete,
  onDuplicate,
  // =======ADDING PLAYBOOK COMBINATION========
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
  // =======END OF ADDING PLAYBOOK COMBINATION=====
}: Props) {
  // =======ADDING PLAYBOOK COMBINATION========
  const handleCardClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(playbook.id, !isSelected);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(playbook.id, e.target.checked);
    }
  };
  // =======END OF ADDING PLAYBOOK COMBINATION=====
  return (
    // =======ADDING PLAYBOOK COMBINATION========
    <article
      className={`pb-card ${selectionMode ? "pb-card-selectable" : ""} ${
        isSelected ? "pb-card-selected" : ""
      }`}
      onClick={handleCardClick}
      style={{
        cursor: selectionMode ? "pointer" : "default",
        position: "relative",
      }}
    >
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <div
          className="pb-selection-checkbox"
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 10,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "18px",
              height: "18px",
              borderRadius: "3px",
              border: isSelected ? "none" : "1.5px solid #cbd5e1",
              backgroundColor: isSelected ? "#0F62FE" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              style={{ display: "none" }}
            />
            {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
          </label>
        </div>
      )}
      {/* =======END OF ADDING PLAYBOOK COMBINATION===== */}
 
      {/* =======ADDING PLAYBOOK COMBINATION======== */}
      <header
        className="pb-card-header"
        style={{ paddingLeft: selectionMode ? "36px" : undefined }}
      >
      {/* =======END OF ADDING PLAYBOOK COMBINATION===== */}
        <p className="pb-title">{playbook.title}</p>
        <div className="pb-updated">Last updated: {formatDate(playbook.updatedAt)}</div>
      </header>

      <section className="pb-metadata">
        <div className="pb-chip">
          <div className="pb-chip-label">Type:</div>
          <div className="pb-chip-value">{playbook.type || "—"}</div>
        </div>

        <div className="pb-chip">
          <div className="pb-chip-label">Position:</div>
          <div className="pb-chip-value">{playbook.position || "—"}</div>
        </div>

        <div className="pb-chip">
          <div className="pb-chip-label">Jurisdiction:</div>
          <div className="pb-chip-value">{playbook.jurisdiction || "—"}</div>
        </div>
      </section>

      <p className="pb-desc">{playbook.description}</p>

      <section className="pb-tags">
        {playbook.tags?.length
          ? playbook.tags.map((t, i) => (
              <span key={i} className="pb-tag">
                {t}
              </span>
            ))
          : <span className="pb-tag muted">no tags</span>}
      </section>

      {/* =======ADDING PLAYBOOK COMBINATION======== */}
      {!selectionMode && (
        <footer className="pb-actions">
          <div className="pb-action-left">
            <Tooltip content="Delete playbook" relationship="label" positioning="above">
              <button className="icon-btn" onClick={() => onDelete?.(playbook.id)} style={{ color: "#0F62FE" }}>
                <Trash2 size={18} />
              </button>
            </Tooltip>
          </div>

          <div className="pb-action-right">
            <Tooltip content="Browse playbook" relationship="label" positioning="above">
              <button className="icon-btn" onClick={() => onBrowse?.(playbook.id)} style={{ color: "#0F62FE" }}>
                <Eye size={18} />
              </button>
            </Tooltip>
            <Tooltip content="Playbook settings" relationship="label" positioning="above">
              <button className="icon-btn" onClick={() => onEdit?.(playbook.id)} style={{ color: "#0F62FE" }}>
                <Settings size={18} />
              </button>
            </Tooltip>
            <Tooltip content="Duplicate playbook" relationship="label" positioning="above">
              <button className="icon-btn" onClick={() => onDuplicate?.(playbook.id)} style={{ color: "#0F62FE" }}>
                <Copy size={18} />
              </button>
            </Tooltip>
            <button className="use-btn brand-btn" onClick={() => onUse?.(playbook.id)}>
              <Play size={16} />
              <span>Use</span>
            </button>
          </div>
        </footer>
      )}
      {/* =======END OF ADDING PLAYBOOK COMBINATION===== */}
    </article>
  );
}