/**
 * Panel Types for ThinkMode
 */

export type ContextScope = 'clause' | 'document' | 'general';

export type ThinkIntentClause = 'risk' | 'compare' | 'explain' | 'translate';

export type ThinkIntentDocument = 'overview' | 'key_risks' | 'regulatory' | 'inconsistencies';

export interface ClauseContext {
  text: string;
  sourceDoc: string;
  location: string;
  annotations?: string[];
}

export interface SavePrefill {
  title: string;
  text: string;
  source: {
    doc: string;
    location: string;
  };
}

export interface GeneralSourceConfig {
  includeDocument: boolean;
  enableWebSearch: boolean;
  vaultClauses: string[];
  vaultPlaybooks: string[];
  vaultStandards: string[];
  uploadedFiles: string[];
  importedSources: string[];
}

// Result types
export interface ThinkResult {
  type: 'think';
  intent: ThinkIntentClause;
  content?: string;
  structured?: {
    risks?: string[];
    comparisons?: Array<{ label: string; value: string }>;
    explanation?: string;
    translation?: string;
  };
}

export interface DocumentResult {
  type: 'document';
  intent: ThinkIntentDocument;
  content?: string;
  structured?: {
    overview?: {
      summary: string;
      sections: Array<{
        title: string;
        bullets: string[];
      }>;
    };
    key_risks?: Array<{
      title: string;
      detail: string;
      level: 'low' | 'medium' | 'high';
    }>;
    regulatory?: Array<{
      jurisdiction?: string;
      topic: string;
      bullets: string[];
    }>;
    inconsistencies?: Array<{
      title: string;
      location?: string;
      detail: string;
    }>;
  };
}

export interface GeneralResult {
  type: 'general';
  answer: string;
  citations?: string[];
}

export type PanelResult = ThinkResult | DocumentResult | GeneralResult;


