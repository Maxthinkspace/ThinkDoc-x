/**
 * Think Session Context
 * 
 * Manages session state for ThinkMode, including:
 * - Document caching (send full doc once per session)
 * - Session ID tracking
 * - Parsed document structure
 */

import * as React from 'react';
import type { DocumentNodeWithRange, ParsedDocumentWithRanges } from '../../types/documents';
import type { FilterableAnnotations } from '../../utils/annotationFilter';
import { parseDocumentWithRanges } from '../../services/documentParser';
import { buildCombinedDocumentFromStructure } from '../../utils/annotationFilter';

// ============================================================================
// TYPES
// ============================================================================

interface ThinkSessionState {
  /** Unique session ID */
  sessionId: string;
  /** Whether the document has been sent to backend */
  documentSent: boolean;
  /** Parsed document structure (combined - includes both insertions and deletions) */
  combinedStructure: DocumentNodeWithRange[] | null;
  /** Recitals text */
  recitals: string;
  /** Full document text (built from structure) */
  fullDocumentText: string | null;
  /** Extracted annotations for matching */
  annotations: FilterableAnnotations | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

interface ThinkSessionContextValue extends ThinkSessionState {
  /** Initialize/refresh the session with current document */
  initializeSession: () => Promise<void>;
  /** Mark document as sent to backend */
  markDocumentSent: () => void;
  /** Reset session (e.g., when document changes) */
  resetSession: () => void;
  /** Get full document text (for first request) */
  getFullDocumentForFirstRequest: () => string | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ThinkSessionContext = React.createContext<ThinkSessionContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ThinkSessionProviderProps {
  children: React.ReactNode;
  /** Pre-extracted annotations (optional - can be passed from parent) */
  annotations?: FilterableAnnotations | null;
}

export const ThinkSessionProvider: React.FC<ThinkSessionProviderProps> = ({
  children,
  annotations: externalAnnotations,
}) => {
  const [state, setState] = React.useState<ThinkSessionState>({
    sessionId: generateSessionId(),
    documentSent: false,
    combinedStructure: null,
    recitals: '',
    fullDocumentText: null,
    annotations: externalAnnotations || null,
    isLoading: false,
    error: null,
  });

  // Update annotations when passed from parent
  React.useEffect(() => {
    if (externalAnnotations) {
      setState(prev => ({ ...prev, annotations: externalAnnotations }));
    }
  }, [externalAnnotations]);

  /**
   * Initialize session by parsing the current document
   */
  const initializeSession = React.useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Parse document with ranges
      const parsed = await Word.run(async (context) => {
        return parseDocumentWithRanges(context);
      });

      // Build full document text from combined structure
      const { combinedDocument } = buildCombinedDocumentFromStructure(
        parsed.combinedStructure || [],
        parsed.recitals
      );

      setState(prev => ({
        ...prev,
        combinedStructure: parsed.combinedStructure || null,
        recitals: parsed.recitals || '',
        fullDocumentText: combinedDocument,
        isLoading: false,
      }));

      console.log('[ThinkSession] Session initialized:', {
        sessionId: state.sessionId,
        structureLength: parsed.combinedStructure?.length || 0,
        documentLength: combinedDocument.length,
      });
    } catch (error) {
      console.error('[ThinkSession] Failed to initialize:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to parse document',
      }));
    }
  }, [state.sessionId]);

  /**
   * Mark document as sent to backend (no need to send again)
   */
  const markDocumentSent = React.useCallback(() => {
    setState(prev => ({ ...prev, documentSent: true }));
  }, []);

  /**
   * Reset session (new session ID, clear cached data)
   */
  const resetSession = React.useCallback(() => {
    setState({
      sessionId: generateSessionId(),
      documentSent: false,
      combinedStructure: null,
      recitals: '',
      fullDocumentText: null,
      annotations: externalAnnotations || null,
      isLoading: false,
      error: null,
    });
  }, [externalAnnotations]);

  /**
   * Get full document text for first request
   * Returns null if already sent
   */
  const getFullDocumentForFirstRequest = React.useCallback(() => {
    if (state.documentSent) {
      return null; // Already sent, don't include
    }
    return state.fullDocumentText;
  }, [state.documentSent, state.fullDocumentText]);

  const value: ThinkSessionContextValue = {
    ...state,
    initializeSession,
    markDocumentSent,
    resetSession,
    getFullDocumentForFirstRequest,
  };

  return (
    <ThinkSessionContext.Provider value={value}>
      {children}
    </ThinkSessionContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useThinkSession(): ThinkSessionContextValue {
  const context = React.useContext(ThinkSessionContext);
  if (!context) {
    throw new Error('useThinkSession must be used within ThinkSessionProvider');
  }
  return context;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSessionId(): string {
  return crypto.randomUUID();
}

export default ThinkSessionContext;
