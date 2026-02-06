import * as React from "react";
import { MessageSquare, ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";
import { libraryApi } from "../../../services/libraryApi";
import { ChatSessionItem } from "./ChatSessionItem";
import type { ChatSession } from "./types";
import "./ChatHistory.css";

interface ChatHistorySidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onSessionDeleted: () => void;
  onSessionRenamed: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}


export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  currentSessionId,
  onSelectSession,
  onNewChat,
  onSessionDeleted,
  onSessionRenamed,
  onClose,
  style,
}) => {
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem("chatHistorySidebarCollapsed");
    return saved === "true";
  });

  const loadSessions = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await libraryApi.getChatSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);


  const handleDelete = async (sessionId: string) => {
    try {
      await libraryApi.deleteChatSession(sessionId);
      await loadSessions();
      onSessionDeleted();
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleRename = async () => {
    await loadSessions();
    onSessionRenamed();
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("chatHistorySidebarCollapsed", String(newState));
  };

  // Filter and sort sessions by search query
  const filteredSessions = React.useMemo(() => {
    let filtered = sessions;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sessions.filter((session) =>
        (session.title || "Untitled conversation").toLowerCase().includes(query)
      );
    }
    
    // Sort by most recent first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }, [sessions, searchQuery]);

  // Format timestamp (1m, 1h, 1d, etc.)
  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  if (isCollapsed) {
    return (
      <div className="chat-history-sidebar collapsed">
        <button className="chat-history-sidebar-toggle" onClick={toggleCollapse} title="Expand sidebar">
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="chat-history-sidebar cursor-style" style={style}>
      {onClose && (
        <button
          className="chat-history-sidebar-close"
          onClick={onClose}
          title="Close sidebar"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {/* Search Input */}
      <div className="chat-history-sidebar-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search Agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="chat-history-sidebar-search-input"
        />
      </div>

      {/* New Agent Button */}
      <div className="chat-history-sidebar-header">
        <button className="chat-history-sidebar-new" onClick={onNewChat}>
          <Plus size={16} />
          <span>New Agent</span>
        </button>
      </div>

      {/* Agents Heading */}
      <div className="chat-history-sidebar-title">
        <span>Agents</span>
      </div>

      {/* Sessions List */}
      <div className="chat-history-sidebar-content">
        {isLoading ? (
          <div className="chat-history-sidebar-loading">
            <p>Loading...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="chat-history-sidebar-empty">
            <p>No agents found</p>
          </div>
        ) : (
          <div className="chat-history-sidebar-sessions cursor-style">
            {filteredSessions.map((session) => (
              <ChatSessionItem
                key={session.id}
                session={session}
                isActive={currentSessionId === session.id}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => handleDelete(session.id)}
                onRename={handleRename}
                timestamp={formatTimestamp(session.updatedAt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

