import * as React from "react";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { ChatView } from "./ChatView";
import type { ClauseContext } from "../../../types/panelTypes";
import "./ChatHistory.css";

interface ChatHistoryContainerProps {
  clauseContext: ClauseContext | null;
  initialMessage?: string | null;
  isSidebarOpen?: boolean;
  onSidebarToggle?: (open: boolean) => void;
}

const SMALL_SCREEN_BREAKPOINT = 768;

export const ChatHistoryContainer: React.FC<ChatHistoryContainerProps> = ({
  clauseContext,
  initialMessage,
  isSidebarOpen: externalIsSidebarOpen,
  onSidebarToggle: externalOnSidebarToggle,
}) => {
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [internalSidebarOpen, setInternalSidebarOpen] = React.useState(false);
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isSidebarOpen = externalIsSidebarOpen !== undefined ? externalIsSidebarOpen : internalSidebarOpen;
  const setIsSidebarOpen = externalOnSidebarToggle || setInternalSidebarOpen;

  // Detect small screen and manage sidebar visibility
  React.useEffect(() => {
    const checkScreenSize = () => {
      const small = window.innerWidth < SMALL_SCREEN_BREAKPOINT;
      setIsSmallScreen(small);
      // On small screens, hide sidebar by default
      // On larger screens, show sidebar
      if (!small) {
        setIsSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
  };

  const handleSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Trigger sidebar refresh
    setRefreshKey((prev) => prev + 1);
  };

  const handleSessionDeleted = () => {
    // Sidebar will refresh automatically
  };

  const handleSessionRenamed = () => {
    // Trigger sidebar refresh
    setRefreshKey((prev) => prev + 1);
  };

  const handleTitleUpdated = () => {
    // Trigger sidebar refresh when title is auto-generated
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className={`chat-history-container ${isSmallScreen ? "small-screen" : ""}`}>
      <ChatHistorySidebar
        key={refreshKey}
        currentSessionId={currentSessionId}
        onSelectSession={(sessionId) => {
          handleSelectSession(sessionId);
          // Close sidebar on small screen after selection
          if (isSmallScreen) {
            setIsSidebarOpen(false);
          }
        }}
        onNewChat={() => {
          handleNewChat();
          // Close sidebar on small screen after new chat
          if (isSmallScreen) {
            setIsSidebarOpen(false);
          }
        }}
        onSessionDeleted={handleSessionDeleted}
        onSessionRenamed={handleSessionRenamed}
        onClose={isSmallScreen ? () => setIsSidebarOpen(false) : undefined}
        style={isSmallScreen && !isSidebarOpen ? { display: 'none' } : undefined}
      />
      <div className={`chat-history-main ${!isSidebarOpen && isSmallScreen ? "sidebar-hidden" : ""}`}>
        <ChatView
          sessionId={currentSessionId}
          clauseContext={clauseContext}
          initialMessage={initialMessage}
          onSessionCreated={handleSessionCreated}
          onTitleUpdated={handleTitleUpdated}
        />
      </div>
      {isSmallScreen && isSidebarOpen && (
        <div
          className="chat-history-sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

