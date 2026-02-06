import React from "react";
import { ChevronRight } from "lucide-react";
import type { ActionItem, ActionId } from "./types";

interface ActionRowProps {
  item: ActionItem;
  onAction: (id: ActionId) => void;
}

export const ActionRow: React.FC<ActionRowProps> = ({ item, onAction }) => {
  const handleClick = () => {
    if (item.enabled !== false) {
      onAction(item.id);
    }
  };

  const isEnabled = item.enabled !== false;

  return (
    <div
      onClick={handleClick}
      className={`analysis-item ${isEnabled ? "active" : "disabled"}`}
    >
      <div className="analysis-icon">{item.icon}</div>
      <div className="analysis-text">
        <div className="analysis-title">{item.title}</div>
        <div className="analysis-subtitle">{item.description}</div>
        {!isEnabled && item.disabledReason && (
          <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
            {item.disabledReason}
          </div>
        )}
      </div>
      {isEnabled && <ChevronRight size={16} className="analysis-chevron" />}
    </div>
  );
};
