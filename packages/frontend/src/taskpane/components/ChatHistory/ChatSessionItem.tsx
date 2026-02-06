import * as React from "react";
import { Pencil, Trash2, X, MessageSquare } from "lucide-react";
import { libraryApi } from "../../../services/libraryApi";
import "./ChatHistory.css";

export interface ChatSessionItemProps {
  session: {
    id: string;
    title: string | null;
    updatedAt: string;
  };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  timestamp?: string;
}

export const ChatSessionItem: React.FC<ChatSessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  timestamp,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(session.title || "");
  const [isHovered, setIsHovered] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(session.title || "");
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== session.title) {
      try {
        await libraryApi.updateChatSession(session.id, trimmedValue);
        onRename(trimmedValue);
      } catch (error) {
        console.error("Failed to update session title:", error);
        setEditValue(session.title || "");
      }
    } else {
      setEditValue(session.title || "");
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(session.title || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      onDelete();
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={`chat-session-item ${isActive ? "active" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="chat-session-item-content">
        {isEditing ? (
          <div className="chat-session-item-edit" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="chat-session-item-input"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="chat-session-item-save"
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <MessageSquare size={16} className="chat-session-item-icon" />
            <div className="chat-session-item-title" onDoubleClick={handleDoubleClick}>
              {session.title || "New Chat"}
            </div>
            {timestamp && (
              <div className="chat-session-item-time">{timestamp}</div>
            )}
          </>
        )}
      </div>
      {!isEditing && isHovered && (
        <div className="chat-session-item-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="chat-session-item-action"
            onClick={handleDoubleClick}
            title="Rename"
          >
            <Pencil size={14} />
          </button>
          <button
            className="chat-session-item-action"
            onClick={handleDeleteClick}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

