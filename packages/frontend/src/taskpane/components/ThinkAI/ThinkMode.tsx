/**
 * ThinkMode Component
 * 
 * Provides AI-powered analysis for clauses, documents, and general questions.
 * Supports three context scopes: clause, document, and general.
 */

import * as React from "react";
import {
  Brain,
  GitCompare,
  FileText,
  Languages,
  Sparkles,
  AlertTriangle,
  Scale,
  FileSearch,
} from "lucide-react";
import type {
  ContextScope,
  ThinkIntentClause,
  ThinkIntentDocument,
  ThinkResult,
  DocumentResult,
  GeneralResult,
  ClauseContext,
  SavePrefill,
  PanelResult,
  GeneralSourceConfig,
} from "./panelTypes";
import {
  runThinkIntent,
  runThinkDocumentIntent,
  runThinkGeneralQuestion,
  getDocumentContext,
} from "./panelActions";
import { ContextScopeSwitcher } from "./ContextScopeSwitcher";
import { GeneralSourceSelector } from "./GeneralSourceSelector";
import { InlineDiscuss } from "./InlineDiscuss";
import "./ThinkMode.css";
import { ThinkingDisplay } from './ThinkingDisplay';
import { useThinkSession, ThinkSessionProvider } from '../../contexts/ThinkSessionContext';
import { buildSelectionContext } from '../../../utils/selectionContextBuilder';
import type { SelectionContext } from '../../../types/selectionContext';

// ============================================================================
// TYPES
// ============================================================================

interface ThinkModeProps {
  clauseContext: ClauseContext | null;
  onPromoteToSave: (prefill: SavePrefill) => void;
}

interface ThinkCacheEntry {
  lastIntent?: string;
  lastResult?: PanelResult;
}

interface DocumentContext {
  title?: string;
  summary?: string;
  outline?: string[];
}

interface IntentButton<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLAUSE_INTENTS: IntentButton<ThinkIntentClause>[] = [
  { id: 'risk', label: 'Risk', icon: <Brain size={16} /> },
  { id: 'compare', label: 'Compare', icon: <GitCompare size={16} /> },
  { id: 'explain', label: 'Explain', icon: <FileText size={16} /> },
  { id: 'translate', label: 'Translate', icon: <Languages size={16} /> },
];

const DOCUMENT_INTENTS: IntentButton<ThinkIntentDocument>[] = [
  { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
  { id: 'key_risks', label: 'Key Risks', icon: <AlertTriangle size={16} /> },
  { id: 'regulatory', label: 'Regulatory Issues', icon: <Scale size={16} /> },
  { id: 'inconsistencies', label: 'Inconsistencies', icon: <FileSearch size={16} /> },
];

const INITIAL_CACHE: Record<ContextScope, ThinkCacheEntry> = {
  clause: {},
  document: {},
  general: {},
};

const INITIAL_GENERAL_SOURCE_CONFIG: GeneralSourceConfig = {
  includeDocument: false,
  enableWebSearch: true,
  vaultClauses: [],
  vaultPlaybooks: [],
  vaultStandards: [],
  uploadedFiles: [],
  importedSources: [],
};

const INITIAL_CLAUSE_SOURCE_CONFIG: GeneralSourceConfig = {
  includeDocument: false,
  enableWebSearch: false,
  vaultClauses: [],
  vaultPlaybooks: [],
  vaultStandards: [],
  uploadedFiles: [],
  importedSources: [],
};

const INITIAL_DOCUMENT_SOURCE_CONFIG: GeneralSourceConfig = {
  includeDocument: true,
  enableWebSearch: false,
  vaultClauses: [],
  vaultPlaybooks: [],
  vaultStandards: [],
  uploadedFiles: [],
  importedSources: [],
};

// ============================================================================
// HELPERS
// ============================================================================

function getDocumentIntentTitle(intent: ThinkIntentDocument): string {
  switch (intent) {
    case 'overview':
      return 'Document Overview';
    case 'key_risks':
      return 'Key Risks';
    case 'regulatory':
      return 'Regulatory Issues';
    case 'inconsistencies':
      return 'Inconsistencies';
    default:
      return 'Analysis';
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// COMPONENT
// ============================================================================

const ThinkModeInner: React.FC<ThinkModeProps> = ({
  clauseContext,
  onPromoteToSave,
}) => {
  // Determine default scope based on clause context availability
  // Session context
  const {
    sessionId,
    documentSent,
    combinedStructure,
    recitals,
    fullDocumentText,
    annotations,
    isLoading: sessionLoading,
    initializeSession,
    markDocumentSent,
  } = useThinkSession();

  const defaultScope: ContextScope = clauseContext ? 'clause' : 'general';

  // State
  const [currentScope, setCurrentScope] = React.useState<ContextScope>(defaultScope);
  const [thinkCache, setThinkCache] = React.useState<Record<ContextScope, ThinkCacheEntry>>(INITIAL_CACHE);
  const [selectedIntent, setSelectedIntent] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PanelResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [generalQuestion, setGeneralQuestion] = React.useState("");
  const [docContext, setDocContext] = React.useState<DocumentContext | null>(null);

  // Source configs for each scope
  const [sourceConfig, setSourceConfig] = React.useState<GeneralSourceConfig>(INITIAL_GENERAL_SOURCE_CONFIG);
  const [clauseSourceConfig, setClauseSourceConfig] = React.useState<GeneralSourceConfig>(INITIAL_CLAUSE_SOURCE_CONFIG);
  const [documentSourceConfig, setDocumentSourceConfig] = React.useState<GeneralSourceConfig>(INITIAL_DOCUMENT_SOURCE_CONFIG);
  const [thinking, setThinking] = React.useState<string>('');
  const [workflowSteps, setWorkflowSteps] = React.useState<Array<{ name: string; status: 'pending' | 'active' | 'completed' }>>([]);
  const [isFirstRequest, setIsFirstRequest] = React.useState(true);
  const [conversationHistory, setConversationHistory] = React.useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Initialize session on mount
  React.useEffect(() => {
    initializeSession();
  }, [initializeSession]);
  // Update scope when clause context changes
  React.useEffect(() => {
    if (clauseContext && currentScope === 'document') {
      setCurrentScope('clause');
    } else if (!clauseContext && currentScope === 'clause') {
      setCurrentScope('document');
    }
  }, [clauseContext, currentScope]);

  // Load document context when switching to document scope
  React.useEffect(() => {
    if (currentScope === 'document' && !docContext) {
      getDocumentContext()
        .then(setDocContext)
        .catch(() => setDocContext({}));
    }
  }, [currentScope, docContext]);

  // Restore cached result when switching scopes
  React.useEffect(() => {
    const cached = thinkCache[currentScope];
    if (cached.lastResult) {
      setResult(cached.lastResult);
      setSelectedIntent(cached.lastIntent || null);
    } else {
      setResult(null);
      setSelectedIntent(null);
    }
  }, [currentScope, thinkCache]);

  // Handlers
  const handleScopeChange = (scope: ContextScope) => {
    // Save current result to cache before switching
    if (result) {
      setThinkCache((prev) => ({
        ...prev,
        [currentScope]: {
          lastIntent: selectedIntent || undefined,
          lastResult: result,
        },
      }));
    }
    setCurrentScope(scope);
  };

  const handleClauseIntentClick = async (intent: ThinkIntentClause) => {
    if (!clauseContext) return;

    setSelectedIntent(intent);
    setIsLoading(true);
    setResult(null);

    try {
      const thinkResult = await runThinkIntent(
        intent,
        clauseContext.text,
        clauseSourceConfig,
        clauseContext.annotations
      );
      setResult(thinkResult);
      setThinkCache((prev) => ({
        ...prev,
        clause: { lastIntent: intent, lastResult: thinkResult },
      }));
    } catch (error) {
      console.error("Failed to run think intent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentIntentClick = async (intent: ThinkIntentDocument) => {
    setSelectedIntent(intent);
    setIsLoading(true);
    setResult(null);

    try {
      const ctx = docContext || (await getDocumentContext());
      const docResult = await runThinkDocumentIntent(intent, ctx, documentSourceConfig);
      setResult(docResult);
      setThinkCache((prev) => ({
        ...prev,
        document: { lastIntent: intent, lastResult: docResult },
      }));
    } catch (error) {
      console.error("Failed to run document intent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneralQuestionSubmit = async () => {
    if (!generalQuestion.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    setThinking('');
    setWorkflowSteps([]);
    
    try {
      // Build selection context
      let selectionContext: SelectionContext = { type: 'none' };
      
      try {
        selectionContext = await buildSelectionContext(
          annotations,
          combinedStructure,
          recitals
        );
        console.log('[ThinkMode] Selection context type:', selectionContext.type);
      } catch (err) {
        console.warn('[ThinkMode] Failed to build selection context:', err);
      }

      // Session info
      const sessionInfo = {
        sessionId,
        isFirstRequest: isFirstRequest && !documentSent,
      };
      const fullDocument = sessionInfo.isFirstRequest ? fullDocumentText : undefined;

      const result = await runThinkGeneralQuestion(
        generalQuestion,
        sourceConfig,
        (thinkingContent) => {
          console.log('🟢 ThinkMode: thinking received:', thinkingContent?.substring(0, 50));
          setThinking(thinkingContent);
        },
        (step) => {
          console.log('🟢 ThinkMode: workflowStep received:', step);
          setWorkflowSteps(prev => {
            // Find existing step or add new one
            const existingIndex = prev.findIndex(s => s.name === step.name);
            const newStatus = step.status === 'started' ? 'active' : 'completed';
            
            if (existingIndex >= 0) {
              // Update existing step
              const updated = [...prev];
              updated[existingIndex] = { name: step.name, status: newStatus };
              return updated;
            } else {
              // Add new step
              return [...prev, { name: step.name, status: newStatus }];
            }
          });
        },
        selectionContext,
        sessionInfo,
        fullDocument || undefined,
        conversationHistory  
      );
      setResult(result);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: generalQuestion },
        { role: 'assistant', content: result.answer },
      ]);

      // Mark document as sent after first request
      if (sessionInfo.isFirstRequest) {
        markDocumentSent();
        setIsFirstRequest(false);
      }
    } catch (error) {
      console.error("Failed to run general question:", error);
    } finally {
      setIsLoading(false);
      setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
    }
  };

  const handleGeneralKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGeneralQuestionSubmit();
    }
  };

  const handlePromoteToSave = () => {
    if (!clauseContext) return;

    const suggestedTitle =
      clauseContext.text.substring(0, 50) + (clauseContext.text.length > 50 ? '...' : '');

    const prefill: SavePrefill = {
      title: suggestedTitle,
      text: clauseContext.text,
      source: {
        doc: clauseContext.sourceDoc,
        location: clauseContext.location,
      },
    };
    onPromoteToSave(prefill);
  };

  // Helpers for InlineDiscuss
  const getAnchorType = (): 'clause' | 'output' | 'document' | 'general' => {
    if (currentScope === 'general') return 'general';
    if (currentScope === 'document') return 'document';
    return result ? 'output' : 'clause';
  };

  const getAnchorText = (): string => {
    if (currentScope === 'general') return generalQuestion || '';
    if (currentScope === 'document') return docContext?.summary || '';
    return clauseContext?.text || '';
  };

  // Type guards for results
  const isThinkResult = (r: PanelResult): r is ThinkResult => r.type === 'think';
  const isDocumentResult = (r: PanelResult): r is DocumentResult => r.type === 'document';
  const isGeneralResult = (r: PanelResult): r is GeneralResult => r.type === 'general';

  return (
    <div className="think-mode">
      {/* Context Scope Switcher */}
      <ContextScopeSwitcher
        currentScope={currentScope}
        onScopeChange={handleScopeChange}
        disabled={isLoading}
      />

      {/* General Scope Banner */}
      {currentScope === 'general' && (
        <div className="think-mode-general-banner">
          General discussion — not tied to this document
        </div>
      )}

      {/* Clause Scope */}
      {currentScope === 'clause' && clauseContext && (
        <>
          <GeneralSourceSelector
            sourceConfig={clauseSourceConfig}
            onSourceConfigChange={setClauseSourceConfig}
            disabled={isLoading}
          />
          <div className="think-mode-intents">
            {CLAUSE_INTENTS.map((intent) => (
              <button
                key={intent.id}
                className={`think-mode-intent-button ${selectedIntent === intent.id ? 'active' : ''} ${isLoading ? 'disabled' : ''}`}
                onClick={() => !isLoading && handleClauseIntentClick(intent.id)}
                disabled={isLoading}
              >
                {intent.icon}
                <span>{intent.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Document Scope */}
      {currentScope === 'document' && (
        <>
          <GeneralSourceSelector
            sourceConfig={documentSourceConfig}
            onSourceConfigChange={setDocumentSourceConfig}
            disabled={isLoading}
          />
          <div className="think-mode-intents">
            {DOCUMENT_INTENTS.map((intent) => (
              <button
                key={intent.id}
                className={`think-mode-intent-button ${selectedIntent === intent.id ? 'active' : ''} ${isLoading ? 'disabled' : ''}`}
                onClick={() => !isLoading && handleDocumentIntentClick(intent.id)}
                disabled={isLoading}
              >
                {intent.icon}
                <span>{intent.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* General Scope */}
      {currentScope === 'general' && (
        <>
          <GeneralSourceSelector
            sourceConfig={sourceConfig}
            onSourceConfigChange={setSourceConfig}
            disabled={isLoading}
          />
          <div className="think-mode-general-input">
            <textarea
              className="think-mode-general-textarea"
              placeholder="Ask anything (e.g., regulatory environment, negotiation strategy)…"
              value={generalQuestion}
              onChange={(e) => setGeneralQuestion(e.target.value)}
              onKeyPress={handleGeneralKeyPress}
              rows={3}
              disabled={isLoading}
            />
            <button
              className="think-mode-general-submit"
              onClick={handleGeneralQuestionSubmit}
              disabled={!generalQuestion.trim() || isLoading}
              style={{
                background: (!generalQuestion.trim() || isLoading) ? '#94a3b8' : 'var(--brand-gradient)',
                color: 'var(--text-on-brand)',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Ask
            </button>
          </div>
        </>
      )}

      {/* Loading State */}
      {(isLoading || thinking || workflowSteps.length > 0) && (
        <ThinkingDisplay 
          thinking={thinking} 
          isLoading={isLoading}
          workflowSteps={workflowSteps}
        />
      )}

      {/* Clause Result */}
      {result && isThinkResult(result) && (
        <div className="think-mode-result">
          <div className="think-mode-result-header">
            <h3 className="think-mode-result-title">
              {capitalizeFirst(result.intent)} Analysis
            </h3>
            {clauseContext && (
              <button className="think-mode-promote-button" onClick={handlePromoteToSave}>
                <Sparkles size={14} />
                <span>Promote to Save</span>
              </button>
            )}
          </div>

          <div className="think-mode-output">
            {result.structured?.risks && (
              <div className="think-mode-structured">
                <h4>Risks Identified</h4>
                <ul>
                  {result.structured.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.structured?.comparisons && (
              <div className="think-mode-structured">
                <h4>Comparison</h4>
                <div className="think-mode-comparison-list">
                  {result.structured.comparisons.map((comp, idx) => (
                    <div key={idx} className="think-mode-comparison-item">
                      <strong>{comp.label}:</strong> {comp.value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.structured?.explanation && (
              <div className="think-mode-structured">
                <h4>Explanation</h4>
                <p>{result.structured.explanation}</p>
              </div>
            )}

            {result.structured?.translation && (
              <div className="think-mode-structured">
                <h4>Translation</h4>
                <p>{result.structured.translation}</p>
              </div>
            )}

            {result.content && <div className="think-mode-content">{result.content}</div>}
          </div>

          <InlineDiscuss anchorText={getAnchorText()} anchorType={getAnchorType()} />
        </div>
      )}

      {/* Document Result */}
      {result && isDocumentResult(result) && (
        <div className="think-mode-result">
          <div className="think-mode-result-header">
            <h3 className="think-mode-result-title">{getDocumentIntentTitle(result.intent)}</h3>
            {!clauseContext && (
              <div className="think-mode-instructional-cta">Select a clause to save</div>
            )}
          </div>

          <div className="think-mode-output">
            {result.structured?.overview && (
              <div className="think-mode-structured">
                <h4>Summary</h4>
                <p>{result.structured.overview.summary}</p>
                {result.structured.overview.sections.map((section, idx) => (
                  <div key={idx} className="think-mode-doc-section">
                    <h5>{section.title}</h5>
                    <ul>
                      {section.bullets.map((bullet, bidx) => (
                        <li key={bidx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {result.structured?.key_risks && (
              <div className="think-mode-structured">
                <h4>Key Risks</h4>
                {result.structured.key_risks.map((risk, idx) => (
                  <div key={idx} className={`think-mode-risk-item risk-${risk.level}`}>
                    <strong>{risk.title}</strong>
                    <p>{risk.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {result.structured?.regulatory && (
              <div className="think-mode-structured">
                <h4>Regulatory Issues</h4>
                {result.structured.regulatory.map((issue, idx) => (
                  <div key={idx} className="think-mode-regulatory-item">
                    {issue.jurisdiction && <strong>{issue.jurisdiction}: </strong>}
                    <strong>{issue.topic}</strong>
                    <ul>
                      {issue.bullets.map((bullet, bidx) => (
                        <li key={bidx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {result.structured?.inconsistencies && (
              <div className="think-mode-structured">
                <h4>Inconsistencies</h4>
                {result.structured.inconsistencies.map((item, idx) => (
                  <div key={idx} className="think-mode-inconsistency-item">
                    <strong>{item.title}</strong>
                    {item.location && (
                      <span className="think-mode-location"> ({item.location})</span>
                    )}
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {result.content && <div className="think-mode-content">{result.content}</div>}
          </div>

          <InlineDiscuss anchorText={getAnchorText()} anchorType={getAnchorType()} />
        </div>
      )}

      {/* General Result */}
      {result && isGeneralResult(result) && (
        <div className="think-mode-result">
          <div className="think-mode-result-header">
            <h3 className="think-mode-result-title">Answer</h3>
          </div>

          <div className="think-mode-output">
            <div className="think-mode-general-answer">
              <p>{result.answer}</p>
              {result.citations && result.citations.length > 0 && (
                <div className="think-mode-citations">
                  <h4>Sources</h4>
                  <ul>
                    {result.citations.map((citation, idx) => (
                      <li key={idx}>{citation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <InlineDiscuss anchorText={getAnchorText()} anchorType={getAnchorType()} />
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="think-mode-empty">
          {currentScope === 'clause' && clauseContext && (
            <p>Select an intent to analyze the selected clause</p>
          )}
          {currentScope === 'clause' && !clauseContext && (
            <p>Select a clause to analyze</p>
          )}
          {currentScope === 'document' && <p>Select an intent to analyze the document</p>}
          {currentScope === 'general' && <p>Ask a question above to get started</p>}
        </div>
      )}
    </div>
  );
};

export const ThinkMode: React.FC<ThinkModeProps> = (props) => {
  return (
    <ThinkSessionProvider>
      <ThinkModeInner {...props} />
    </ThinkSessionProvider>
  );
};

export default ThinkMode;
