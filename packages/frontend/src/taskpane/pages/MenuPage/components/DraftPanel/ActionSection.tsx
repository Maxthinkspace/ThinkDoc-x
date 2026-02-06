import React from "react";
import type { ActionItem, ActionId } from "./types";
import { ActionRow } from "./ActionRow";

interface ActionSectionProps {
  title: string;
  items: ActionItem[];
  onAction: (id: ActionId) => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({
  title,
  items,
  onAction,
}) => {
  return (
    <div className="review-section">
      <h3 className="section-header">{title}</h3>
      <div className="analysis-strategy-list">
        {items.map((item) => (
          <ActionRow key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    </div>
  );
};
