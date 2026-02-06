import * as React from "react";
import { Clock, FileText, MessageSquare, Sparkles } from "lucide-react";
import { libraryApi } from "../../../services/libraryApi";
import type { ChatSession } from "../ChatHistory/types";
import "./RecentActivitySelector.css";

interface RecentActivity {
  id: string;
  type: "ask" | "review" | "playbook" | "other";
  title: string;
  subtitle?: string;
  timestamp: Date;
  sessionId?: string;
}

interface RecentActivitySelectorProps {
  onSelectActivity: (activity: RecentActivity | null) => void;
  selectedActivity: RecentActivity | null;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const RecentActivitySelector: React.FC<RecentActivitySelectorProps> = ({
  onSelectActivity,
  selectedActivity,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [activities, setActivities] = React.useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchRecentActivities();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      if (showDropdown) {
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, [showDropdown]);

  const fetchRecentActivities = async () => {
    setIsLoading(true);
    try {
      // Fetch recent chat sessions (Ask activities)
      const chatSessions = await libraryApi.getChatSessions();
      
      const askActivities: RecentActivity[] = (chatSessions || [])
        .slice(0, 5) // Get 5 most recent
        .map((session: ChatSession | any) => ({
          id: session.id,
          type: "ask" as const,
          title: session.title || "Untitled conversation",
          subtitle: (session.messages?.[0]?.content || "").substring(0, 50) || "",
          timestamp: new Date(session.updatedAt),
          sessionId: session.id,
        }));

      // Sort by timestamp (most recent first)
      const sorted = askActivities.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      setActivities(sorted);
    } catch (error) {
      console.error("Failed to fetch recent activities:", error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "ask":
        return <MessageSquare size={16} />;
      case "review":
        return <FileText size={16} />;
      case "playbook":
        return <Sparkles size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="recent-activity-selector-wrapper">
      <div className="recent-activity-selector" ref={dropdownRef}>
        <button
          className="recent-activity-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          <Clock size={16} />
          <span>
            {selectedActivity ? `Ask about: ${selectedActivity.title}` : "New Ask"}
          </span>
          <span className="recent-activity-chevron">▼</span>
        </button>

      {showDropdown && (
        <div className="recent-activity-dropdown">
          <button
            className={`recent-activity-item ${!selectedActivity ? "active" : ""}`}
            onClick={() => {
              onSelectActivity(null);
              setShowDropdown(false);
            }}
            type="button"
          >
            <MessageSquare size={16} />
            <div className="recent-activity-item-content">
              <div className="recent-activity-item-title">New Ask</div>
              <div className="recent-activity-item-subtitle">Start a fresh conversation</div>
            </div>
          </button>

          {isLoading ? (
            <div className="recent-activity-loading">Loading recent activities...</div>
          ) : activities.length === 0 ? (
            <div className="recent-activity-empty">No recent activities</div>
          ) : (
            <>
              <div className="recent-activity-divider">Recent Activity</div>
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  className={`recent-activity-item ${
                    selectedActivity?.id === activity.id ? "active" : ""
                  }`}
                  onClick={() => {
                    onSelectActivity(activity);
                    setShowDropdown(false);
                  }}
                  type="button"
                >
                  {getActivityIcon(activity.type)}
                  <div className="recent-activity-item-content">
                    <div className="recent-activity-item-title">{activity.title}</div>
                    {activity.subtitle && (
                      <div className="recent-activity-item-subtitle">{activity.subtitle}</div>
                    )}
                    <div className="recent-activity-item-time">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      </div>
      {onToggleSidebar && (
        <button
          className="recent-activity-sidebar-toggle"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide history" : "Show history"}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 5H17M3 10H17M3 15H17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

