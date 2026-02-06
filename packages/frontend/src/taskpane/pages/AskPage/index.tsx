import * as React from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Spinner } from "@fluentui/react-components";
import { useNavigation } from "../../hooks/use-navigation";
import { useTextSelection } from "../../hooks/use-text-selection";
import { useDocumentAnnotations } from "../../contexts/AnnotationContext";
import { ChatHistoryContainer } from "../../components/ChatHistory";
import { RecentActivitySelector } from "../../components/RecentActivitySelector";
import { ChatTips } from "../../components/ChatTips";
import type { ClauseContext } from "../../../types/panelTypes";
import type { AnnotationPreview } from "../../../types/annotationScope";
import "./styles/AskPage.css";

export const AskPage: React.FC = () => {
  const { goBack } = useNavigation();
  
  // Get document annotations from context
  const { 
    annotations: documentAnnotations, 
    combinedStructure, 
    recitals,
    isLoading: isExtractingAnnotations,
    error: extractionError,
    extract,
  } = useDocumentAnnotations();

  // Trigger extraction on mount if not already loaded
  React.useEffect(() => {
    if (!documentAnnotations && !isExtractingAnnotations && !extractionError) {
      extract();
    }
  }, [documentAnnotations, isExtractingAnnotations, extractionError, extract]);

  // Pass document annotations to useTextSelection
  const { selectedText, hasSelection, annotations } = useTextSelection({
    enabled: true,
    documentAnnotations,
    combinedStructure,
    recitals,
  });

  // Read context and initial message from sessionStorage
  const [initialContextText, setInitialContextText] = React.useState<string | null>(() => {
    const context = sessionStorage.getItem("askContextText");
    if (context) {
      sessionStorage.removeItem("askContextText");
      return context;
    }
    return null;
  });

  // Read stored annotations (captured at the same moment as text)
  const [initialContextAnnotations, setInitialContextAnnotations] = React.useState<AnnotationPreview | null>(() => {
    const stored = sessionStorage.getItem("askContextAnnotations");
    if (stored) {
      sessionStorage.removeItem("askContextAnnotations");
      try {
        return JSON.parse(stored) as AnnotationPreview;
      } catch (e) {
        console.error('[AskPage] Failed to parse stored annotations:', e);
        return null;
      }
    }
    return null;
  });

  const [initialMessage, setInitialMessage] = React.useState<string | null>(() => {
    const message = sessionStorage.getItem("askInitialMessage");
    if (message) {
      sessionStorage.removeItem("askInitialMessage");
      return message;
    }
    return null;
  });

  const [selectedActivity, setSelectedActivity] = React.useState<any>(null);
  const [showTips, setShowTips] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Convert to ClauseContext format
  // Key: Use stored annotations when text comes from sessionStorage,
  // otherwise use live annotations from useTextSelection
  const clauseContext: ClauseContext | null = React.useMemo(() => {
    // Determine text source
    const textFromStorage = initialContextText;
    const textFromSelection = selectedText;
    const text = textFromStorage || textFromSelection || null;
    
    // Use matching annotations based on text source
    // If text is from sessionStorage, use stored annotations (captured together)
    // If text is from live selection, use live annotations
    const matchingAnnotations = textFromStorage 
      ? initialContextAnnotations 
      : annotations;
    
    // Debug logging
    console.log('[AskPage] Text source:', textFromStorage ? 'sessionStorage' : 'liveSelection');
    console.log('[AskPage] text length:', text?.length);
    console.log('[AskPage] annotations source:', textFromStorage ? 'stored' : 'live');
    console.log('[AskPage] annotations:', matchingAnnotations);
    
    if (!text) return null;
    
    return {
      text,
      annotations: matchingAnnotations || undefined,
    };
  }, [initialContextText, selectedText, annotations, initialContextAnnotations]);

  // Show loading state while extracting annotations (only on first load)
  if (isExtractingAnnotations && !documentAnnotations) {
    return (
      <div className="ask-page ask-page-loading">
        <div className="ask-page-header">
          <button className="ask-page-back-button" onClick={goBack} title="Go back">
            <ArrowLeft size={20} />
          </button>
          <h2 className="ask-page-title">Think AI</h2>
        </div>
        <div className="ask-page-loading-container">
          <div className="ask-page-loading-card">
            <h3 className="ask-page-loading-title">Loading Annotations</h3>
            <Spinner size="medium" />
            <p className="ask-page-loading-text">Extracting annotations from document...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-page">
      <div className="ask-page-header">
        <button className="ask-page-back-button" onClick={goBack} title="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="ask-page-title">Think AI</h2>
      </div>

      <div className="ask-page-content">
        <div className="ask-page-activity-selector">
          <RecentActivitySelector
            onSelectActivity={setSelectedActivity}
            selectedActivity={selectedActivity}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
          <button
            className="ask-page-tips-button"
            onClick={() => setShowTips(true)}
            title="Tips & Help"
            type="button"
          >
            <Info size={18} />
          </button>
        </div>
        <ChatHistoryContainer
          clauseContext={clauseContext}
          initialMessage={initialMessage}
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={setIsSidebarOpen}
        />
      </div>
      <ChatTips isOpen={showTips} onClose={() => setShowTips(false)} />
    </div>
  );
};

export default AskPage;