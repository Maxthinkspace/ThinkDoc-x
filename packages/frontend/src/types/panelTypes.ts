/**
 * ThinkDoc Panel Types
 * 
 * Type definitions for the ThinkAI panel components.
 * Uses rich annotation types from types/documents.ts for full data fidelity.
 */

import type { AnnotationPreview } from './annotationScope';

// ============================================================================
// MODE & INTENT TYPES
// ============================================================================

export type Mode = 'think' | 'draft' | 'save';
export type ContextScope = 'clause' | 'document' | 'general';
export type PanelState = 'idle' | 'ready' | 'loading' | 'error';

/** Intents for THINK mode - clause level */
export type ThinkIntentClause = 'risk' | 'compare' | 'explain' | 'translate';
/** Alias for backward compatibility */
export type IntentThink = ThinkIntentClause;

/** Intents for THINK mode - document level */
export type ThinkIntentDocument = 'overview' | 'key_risks' | 'regulatory' | 'inconsistencies';

/** Intents for DRAFT mode */
export type IntentDraft = 'buyer' | 'seller' | 'fallback' | 'clean';

// ============================================================================
// CLAUSE CONTEXT
// ============================================================================

/**
 * Context for a selected clause, including rich annotation data.
 */
export interface ClauseContext {
  /** Unique identifier for the clause (optional) */
  clauseId?: string;
  /** The clause text */
  text: string;
  /** Source document name */
  sourceDoc?: string;
  /** Location within document (e.g., section number, paragraph) */
  location?: string;
  /** Rich annotations extracted from the selection */
  annotations?: AnnotationPreview;
}

// ============================================================================
// SOURCE CONFIGURATION
// ============================================================================

/**
 * Imported source from external systems (iManage, Google Drive, SharePoint)
 */
export interface ImportedSource {
  id: string;
  type: 'imanage' | 'googledrive' | 'sharepoint';
  name: string;
  content: string;
}

/**
 * Configuration for general questions - what sources to include
 */
export interface GeneralSourceConfig {
  /** Include current document context */
  includeDocument: boolean;
  /** Vault playbook IDs to reference */
  vaultPlaybooks: string[];
  /** Vault clause IDs to reference */
  vaultClauses: string[];
  /** Vault standard IDs to reference */
  vaultStandards: string[];
  /** Uploaded files with content */
  uploadedFiles: Array<{ id: string; name: string; content: string }>;
  /** Imported sources from external systems */
  importedSources: ImportedSource[];
  /** Enable web search */
  enableWebSearch?: boolean;
}

// ============================================================================
// SAVE PREFILL
// ============================================================================

/**
 * Pre-filled data for saving a clause to the library
 */
export interface SavePrefill {
  /** Suggested title */
  title?: string;
  /** Clause text */
  text: string;
  /** Suggested clause type/category */
  clauseType?: string;
  /** Jurisdiction (e.g., Singapore, Hong Kong) */
  jurisdiction?: string;
  /** Perspective (buyer or seller) */
  perspective?: 'buyer' | 'seller';
  /** Suggested tags */
  tags?: string[];
  /** Source information */
  source?: {
    doc?: string;
    section?: string;
    location?: string;
  };
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result from a THINK clause intent
 */
export interface ThinkResult {
  type: 'think';
  intent: ThinkIntentClause;
  content: string;
  structured?: {
    /** Risk analysis results */
    risks?: string[];
    /** Comparison results */
    comparisons?: Array<{ label: string; value: string }>;
    /** Plain text explanation */
    explanation?: string;
    /** Translation result */
    translation?: string;
  };
}

/**
 * Result from a THINK document intent
 */
export interface DocumentResult {
  type: 'document';
  intent: ThinkIntentDocument;
  content: string;
  structured?: {
    /** Document overview */
    overview?: {
      summary: string;
      sections: Array<{ title: string; bullets: string[] }>;
    };
    /** Key risks identified */
    key_risks?: Array<{
      level: 'high' | 'medium' | 'low';
      title: string;
      detail: string;
    }>;
    /** Regulatory issues */
    regulatory?: Array<{
      jurisdiction?: string;
      topic: string;
      bullets: string[];
    }>;
    /** Inconsistencies found */
    inconsistencies?: Array<{
      title: string;
      location?: string;
      detail: string;
    }>;
  };
}

/**
 * Result from a general question
 */
export interface GeneralResult {
  type: 'general';
  intent: 'ask';
  answer: string;
  citations?: string[];
  thinking?: string;
}

/**
 * Result from a DRAFT intent
 */
export interface DraftResult {
  type: 'draft';
  intent: IntentDraft;
  alternativeWording: string;
  fallbacks?: string[];
  notes?: string;
}

/**
 * Union of all result types
 */
export type PanelResult = ThinkResult | DocumentResult | GeneralResult | DraftResult;

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * A message in the chat history
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Associated result data (for assistant messages) */
  result?: PanelResult;
  /** Whether this message is currently loading */
  isLoading?: boolean;
}

/**
 * Chat session state
 */
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  clauseContext?: ClauseContext;
  mode: Mode;
  createdAt: Date;
  updatedAt: Date;
}
