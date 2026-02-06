import type { 
  ParsedDocument,
  CommentExtractionResult, 
  HighlightExtractionResult, 
  TrackChangeExtractionResults 
} from '@/src/types/documents';
import type {
  ClassifyDocumentResponse,
} from '@/src/types/documents';
import type { DocumentNode, SectionNode } from '@/src/types/documents';
import type { RedomiciledSection, RedomicileMetadata } from '@/src/types/redomicile';
import { buildSourceAnnotationMap } from '../utils/selectionContextBuilder';
import type { FullClassificationOutput } from '@/src/types/annotation-classifier';

export interface BackendApiOptions {
  baseUrl?: string;
}

export interface Rule {
  id?: string;
  rule_number: string;
  brief_name?: string;
  instruction: string;
  example_language?: string;
  contract_clause?: string;
  selected?: boolean;
}

export interface RuleCategory {
  type: string;
  rules: Rule[];
}

export interface RerunRulesRequest {
  generationContext: {
    sourceAnnotationKey: string;
    batchId: string;
    topLevelSectionNumber: string;
    context: string;
    sentences: string[];
    formattedAnnotation: string;
    annotation: any;
  };
  previousRules: Array<{
    id: string;
    rule_number: string;
    brief_name: string;
    instruction: string;
    example_language?: string;
    location_text?: string;
    sourceAnnotationKey?: string;
  }>;
  originalExampleLanguage?: string;
}

export interface RerunRulesResponse {
  success: boolean;
  data?: {
    newRules: Array<{
      id: string;
      rule_number: string;
      brief_name: string;
      instruction: string;
      example_language?: string;
      location_text?: string;
      sourceAnnotationKey?: string;
    }>;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface StandardStringResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

export interface ChangeWithLocation {
  text: string;
  type: 'added' | 'deleted';
  location: string;
}

export interface GeneratePlaybookRequest {
  parsedDocument: ParsedDocument;
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
  classificationResult?: FullClassificationOutput;
}

export interface GeneratePlaybookResponse {
  success: boolean;
  playbook?: {
    instructionRequestRules: Rule[];
    alwaysAppliedRules: Rule[];
    conditionalRules: Rule[];
  };
  rerunContexts?: Record<string, {
    sourceAnnotationKey: string;
    batchId: string;
    topLevelSectionNumber: string;
    context: string;
    sentences: string[];
    formattedAnnotation: string;
    annotation: any;
  }>;
  classificationResult?: FullClassificationOutput;
  error?: { message: string; code?: string };
}

export interface CreatePlaybookRequest {
  playbookName: string;
  description?: string;
  playbookType?: string;
  userPosition?: string;
  jurisdiction?: string;
  tags?: string;
  rules: any;
  metadata?: any;
}

export interface UpdatePlaybookRequest {
  playbookName?: string;
  description?: string;
  playbookType?: string;
  userPosition?: string;
  jurisdiction?: string;
  tags?: string;
  rules?: any;
  metadata?: any;
}

export interface Playbook {
  id: string;
  userId: string;
  playbookName: string;
  description?: string;
  playbookType?: string;
  userPosition?: string;
  jurisdiction?: string;
  tags?: string;
  rules: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybooksListResponse {
  data: Playbook[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface PlaybookResponse {
  data: Playbook;
}

// ============================================
// PLAYBOOK COMBINATION - Rule Comparison
// ============================================

export interface RulePair {
  ruleA: {
    id: string;
    rule_number: string;
    brief_name: string;
    instruction: string;
    example_language?: string;
    sourcePlaybookId: string;
    sourcePlaybookName: string;
  };
  ruleB: {
    id: string;
    rule_number: string;
    brief_name: string;
    instruction: string;
    example_language?: string;
    sourcePlaybookId: string;
    sourcePlaybookName: string;
  };
  similarityScore?: number;
  explanation?: string;
}

export interface CompareRulesRequest {
  baseRules: Array<{
    id: string;
    rule_number: string;
    brief_name: string;
    instruction: string;
    example_language?: string;
    sourcePlaybookId: string;
    sourcePlaybookName: string;
    categoryType: string;
  }>;
  comparisonRules: Array<{
    id: string;
    rule_number: string;
    brief_name: string;
    instruction: string;
    example_language?: string;
    sourcePlaybookId: string;
    sourcePlaybookName: string;
    categoryType: string;
  }>;
}

export interface CompareRulesResponse {
  success: boolean;
  data?: {
    overlappingPairs: RulePair[];
    conflictingPairs: RulePair[];
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface MergeRulesRequest {
  rules: Array<{
    id: string;
    instruction: string;
    example_language?: string;
    brief_name?: string;
  }>;
}

export interface MergeRulesResponse {
  success: boolean;
  data?: {
    mergedRule: {
      id: string;
      rule_number: string;
      brief_name: string;
      instruction: string;
      example_language?: string;
    };
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

export interface ReviewWithPlaybooksRequest {
  structure: any[];
  rules: Array<{
    id: string;
    content: string;
    example?: string;
  }>;
}

// ============================================
// DRAFTING MODULE TYPES
// ============================================

export interface DraftWithInstructionsRequest {
  structure: any[];
  instructions: string;
  selectedPrompts: { id: string; prompt: string }[];
  conversationHistory?: Array<{
    instructions: string;
    amendedSections: Array<{
      sectionNumber: string;
      status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
    }>;
  }>;
  definitionSection?: string;
}

export interface DraftingSectionChange {
  status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
  original_language: string;
  amended_language?: string;
  section_number: string;
  isFullDeletion?: boolean;
}

export interface DraftWithInstructionsResponse {
  success: boolean;
  formattedResults: { [instructionId: string]: DraftingSectionChange[] };
}

// ============================================
// END OF DRAFTING MODULE TYPES
// ============================================

export interface ReviewWithPlaybooksResponse {
  success: boolean;
  formattedResults: {
    [ruleId: string]: Array<{
      status: "amended" | "not-amended" | "not-found" | "new-section" | "instruction-request";
      original_language?: string;
      amended_language?: string;
      section_number: string;
      isFullDeletion?: boolean;
      issue?: string;
    }>;
  };
}

export interface ExplainUnappliedRuleRequest {
  sectionText: string;
  rule: {
    id: string;
    content: string;
    example?: string;
  };
}

export interface ExplainUnappliedRuleResponse {
  explanation: string;
}

export interface HandleMissingLanguageRequest {
  rule: string;
  exampleLanguage: string;
  documentOutline: any[];
  fullDocumentText: string;
}

export interface HandleMissingLanguageResponse {
  proposedLanguage: string;
  suggestedHeading: string;
  afterSection: string;
  newSectionNumber: string;
  beforeAfter: {
    before: string;
    after: string;
  };
}

export interface ReviewWithPrecedentsRequest {
  originalDocument: {
    recitals: string;
    structure: DocumentNode[];
  };
  referenceDocument: {
    recitals: string;
    structure: DocumentNode[];
  };
  debug?: string;
}

export interface FormattedAmendment {
  change_type: 'addition' | 'deletion';
  original_section: string;
  reference_section: string | null;  
  original_language: string;
  amended_language: string;
  isFullDeletion?: boolean;
}

export interface ReviewWithPrecedentsResponse {
  success: boolean;
  formattedResults: FormattedAmendment[]; 
}

// ============================================
// SUMMARY GENERATION
// ============================================

export interface GenerateSummaryRequest {
  parsedDocument: ParsedDocument;
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
  userPosition?: string;
  includeRecommendations?: boolean;
  classificationResult?: FullClassificationOutput;
}

export interface SubstantiveChange {
  change_description: string;
  implication: string;
  recommendation: string;
}

export interface EditorialChange {
  items: string[];
}

export interface QueryChange {
  items: string[];
}

export interface SourceAnnotationTrackChange {
  type: 'trackChange';
  annotationId: string;
  sectionNumber: string;
  originalSentence: string;
  amendedSentence: string;
  deleted: Array<{ text: string; startOffset: number; endOffset: number }>;
  added: Array<{ text: string; startOffset: number; endOffset: number }>;
  /** For multi-section sentences: maps section contributions to sentence positions */
  sentenceFragments?: Array<{
    sectionNumber: string;
    textFragment: string;
    cumulativeStartOffset: number;
    sectionStartOffset: number;
    sectionEndOffset: number;
  }>;
}

export interface SourceAnnotationComment {
  type: 'comment';
  annotationId: string;
  sectionNumber: string;
  selectedText: string;
  commentContent: string;
  author?: string;
  startOffset: number;
  endOffset: number;
  /** The full sentence containing the selected text (from deepest section) - used for locating */
  affectedSentence?: string;
}

export interface SourceAnnotationFullSentenceDeletion {
  type: 'fullSentenceDeletion';
  annotationId: string;
  sectionNumber: string;
  deletedText: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceAnnotationFullSentenceInsertion {
  type: 'fullSentenceInsertion';
  annotationId: string;
  sectionNumber: string;
  insertedText: string;
  startOffset: number;
  endOffset: number;
}

export type SourceAnnotation =
  | SourceAnnotationTrackChange
  | SourceAnnotationComment
  | SourceAnnotationFullSentenceDeletion
  | SourceAnnotationFullSentenceInsertion;

export interface SentenceSummary {
  id: string;
  sentence: string;
  sourceAnnotation: SourceAnnotation;
  substantive?: SubstantiveChange;
  editorial?: EditorialChange;
  query?: QueryChange;
}

export interface SectionSummary {
  sectionNumber: string;
  sectionTitle: string;
  sentences: SentenceSummary[];
}

export interface SummaryGenerationContext {
  sourceAnnotationKey: string;
  batchId: string;
  topLevelSectionNumber: string;
  context: string;
  formattedAnnotation: string;
  annotation: SourceAnnotation;
  category: 'S' | 'Q' | 'E';
  userPosition?: string;
}

export interface GenerateSummaryResponse {
  success: boolean;
  summary: {
    sections: SectionSummary[];
  };
  rerunContexts?: Record<string, SummaryGenerationContext>;
  metadata: {
    totalSentences: number;
    processingTimeMs: number;
  };
  classificationResult?: FullClassificationOutput;
  error?: { message: string; code?: string };
}

// Position extraction
export interface ExtractPositionsRequest {
  recitals: string;
}

export interface ExtractPositionsResponse {
  success: boolean;
  data?: {
    positions: Array<{ party: string; position: string }>;
    normalized: string[];
  };
  error?: { message: string };
}

// Summary re-run
export interface RerunSummaryRequest {
  generationContext: SummaryGenerationContext;
  previousSummaries: Array<{
    attempt: number;
    changeDescription: string;
    implication: string;
    recommendation?: string;
  }>;
}

export interface RerunSummaryResponse {
  success: boolean;
  data?: {
    newSummary: SentenceSummary;
  };
  error?: { message: string };
}

// Version tracking for carousel
export interface SummaryVersion {
  versionIndex: number;
  summary: SentenceSummary;
  isOriginal: boolean;
  attempt: number;
}

// ============================================
// ANNOTATION EXPLAINER
// ============================================

export interface ExplainAnnotationsRequest {
  parsedDocument: ParsedDocument;
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
  question?: string;
}

export interface AnnotationExplanation {
  annotationType: 'comment' | 'highlight' | 'trackChange';
  text: string;
  meaning: string;
  implication: string;
  sectionContext: string;
}

export interface ExplainAnnotationsResponse {
  success: boolean;
  explanation: string;
  details: AnnotationExplanation[];
  error?: { message: string; code?: string };
}

// ============================================
// NEW: REDRAFT
// ============================================

  export interface RedraftRequest {
    originalStructure: SectionNode[];
    instructions: {
      targetJurisdiction: string;
      targetLegalSystem: string;
      preserveBusinessTerms: boolean;
      additionalGuidance?: string;
    };
  }

  export interface DraftedSentence {
    text: string;
    footnoteNumber?: number;
    footnoteType: 'original' | 'addition';
    footnoteContent: string;
    originalSectionRef?: string;
  }

  export interface DraftedClause {
    clauseNumber: string;
    clauseHeading?: string;
    sentences: DraftedSentence[];
  }

  export interface DraftedSection {
    sectionNumber: string;
    sectionHeading: string;
    clauses: DraftedClause[];
  }

  export interface SkeletonSection {
    newSectionNumber: string;
    newSectionHeading: string;
    oldSectionNumbers: string[];
    oldSectionHeadings: string[];
    isLegalSection: boolean;
    restructuringNotes?: string;
  }

  export interface RedraftResponse {
    success: boolean;
    skeleton: SkeletonSection[];
    draftedSections: DraftedSection[];
    metadata: {
      totalSections: number;
      totalApiCalls: number;
      processingTimeMs: number;
    };
  }

  // ============================================
  // END OF REDRAFT
  // ============================================

  // ============================================
  // NEW: REDOMICILE
  // ============================================

  export interface RedomicileRequest {
    originalStructure: SectionNode[];
    sourceJurisdiction: string;
    targetJurisdiction: string;
    documentType: string;
    additionalGuidance?: string;
  }


  export interface RedomicileResponse {
    success: boolean;
    sections: RedomiciledSection[];
    metadata: RedomicileMetadata;
  }

  // ============================================
  // END OF REDOMICILE
  // ============================================

  export interface PrepareAnnotationsRequest {
    parsedDocument: ParsedDocument;
    comments: CommentExtractionResult[];
    highlights: HighlightExtractionResult[];
    trackChanges: TrackChangeExtractionResults;
    recitals?: string;
  }

  export interface PrepareAnnotationsResponse {
    success: boolean;
    classificationResult?: FullClassificationOutput;
    positions?: { positions: { party: string; position: string }[]; normalized: string[] };
    error?: { message: string };
  }

// export interface AnalyzeDefinitionsRequest {
//   structure: DocumentNode[];
//   recitals?: string;  
//   language?: 'english' | 'chinese';
// }
export interface TermOccurrence {
  sentence: string;
  sectionReference: string;
}

export interface UnusedDefinition {
  term: string;
  definitionText: string;
  sectionReference: string;
  usageCount: number;
}

export interface DuplicateDefinition {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface UndefinedTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface TermVariation {
  variant: string;
  count: number;
  occurrences: TermOccurrence[];
}

export interface InconsistentTerm {
  term: string;
  totalOccurrences: number;
  definedForm?: string;
  variations: TermVariation[];
}

export interface MissingQuoteTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface CapitalizationIssue {
  term: string;
  expectedForm: string;
  issues: {
    foundForm: string;
    sectionReference: string;
    sentence: string;
  }[];
}

export interface DefinitionCheckResult {
  unusedDefinitions: UnusedDefinition[];
  duplicateDefinitions: DuplicateDefinition[];
  undefinedTerms: UndefinedTerm[];
  inconsistentTerms: InconsistentTerm[];
  missingQuoteTerms: MissingQuoteTerm[];
  capitalizationIssues: CapitalizationIssue[];
  summary: {
    totalIssues: number;
    unusedCount: number;
    duplicateCount: number;
    undefinedCount: number;
    inconsistentCount: number;
    missingQuotesCount: number;
    capitalizationCount: number;
    neverUsedCount: number;
    usedOnceCount: number;
  };
}

export interface GenerateDefinitionResult {
  status: 'amended' | 'new_section' | 'error';
  definitionText: string;
  originalText: string;
  amendedText: string;
  sectionNumber: string;
  suggestedHeading?: string;
  errorMessage?: string;
}

export interface ResolveDuplicateAmendment {
  sectionReference: string;
  originalText: string;
  amendedText: string;
}

export interface ResolveDuplicatesResult {
  status: 'success' | 'error';
  term: string;
  amendments: ResolveDuplicateAmendment[];
  errorMessage?: string;
}

// ============================================
// Subscription Interface
// ============================================
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    token?: string;
  };
  error?: {
    message: string;
    code?: string;
    statusCode?: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    token: string;
    expiresIn: string;
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      subscription?: Subscription | null;
    };
  };
}

export interface GetMeResponse {
  data: {
    id: string;
    email: string;
    name: string;
    organizationId?: string | null;
    organization?: {
      id: string;
      name: string;
      domain: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    active_subscription_id?: string | null;
    subscription?: Subscription | null;
  };
}

export interface CreateSubscriptionRequest {
  subscriptionType: string;
  billingPeriod: string;
}

export interface CreateSubscriptionResponse {
  url: string;
  subscriptionType: string;
  billingPeriod: string;
}

export interface Subscription {
  id: string;
  userId: string;
  subscriptionType: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  startDate: string;
  endDate: string;
  trialEndDate?: string | null;
  autoRenew: boolean;
  amount: string;
  currency: string;
  billingPeriod: string;
  paymentProvider: string;
  paymentId: string;
  createdAt: string;
  updatedAt: string;
  portal_url?: string;
}

export interface GetSubscriptionsResponse {
  data: Subscription[];
}

// ============================================
// Job Progress Interface
// ============================================
export interface JobProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  thinkingSteps?: string[];
}

export class BackendApiService {
  private baseUrl: string;

  constructor(options: BackendApiOptions = {}) {
    // Use same-origin by default so webpack dev-server proxy handles /api -> https://localhost:3003
    this.baseUrl = options.baseUrl ?? "";
  }

  private getAuthHeaders(requestId?: string): HeadersInit {
    const rawToken = localStorage.getItem("authToken");
    const token = rawToken?.trim();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (requestId) {
      headers["x-request-id"] = requestId;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {

      // Backend can return either JSON ({ error: { message }}) or plain text (e.g. auth middleware).
      // Use a clone so we can safely attempt multiple parses.
      const clone = response.clone();
      let errorData: any = {};
      let errorText: string | null = null;
      try {
        errorData = await clone.json();
      } catch {
        try {
          const txt = await clone.text();
          errorText = txt?.trim() ? txt.trim() : null;
        } catch {
          // ignore
        }
      }

      const error = new Error(
        (errorData as any)?.error?.message ||
          errorText ||
          `HTTP ${response.status}: ${response.statusText}`
      ) as Error & { code?: string; status?: number; details?: any };

      // Attach error metadata for better error handling
      if (errorData?.error) {
        error.code = errorData.error.code;
        error.status = errorData.error.status || response.status;
        error.details = errorData.error.details;
      } else {
        error.status = response.status;
      }

      throw error;
    }
    return response.json();
  }

  /**
   * Retry a fetch request with exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (!response.ok && response.status !== 429 && response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx) and rate limits (429)
        if (response.ok || (response.status >= 500 || response.status === 429)) {
          if (response.ok) {
            return response;
          }

          // If not the last attempt, wait and retry
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry network errors on last attempt
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
      }
    }

    // If all retries failed, throw the last error
    throw lastError || new Error('Request failed after retries');
  }

  // ============================================
  // Chunking Methods
  // ============================================
  private async smartFetch(path: string, body: any, requestId?: string): Promise<Response> {
    const JSON_THRESHOLD = 512 * 1024; 
    const jsonString = JSON.stringify(body);
    const url = `${this.baseUrl}${path}`;

    // If small enough, just do a normal fetch with retry
    if (jsonString.length < JSON_THRESHOLD) {
      console.log(`Size ${jsonString.length} does not exceed threshold. No chunking.`);
      try {
        return await this.fetchWithRetry(url, {
          method: 'POST',
          headers: this.getAuthHeaders(requestId), // Includes Content-Type: application/json
          body: jsonString,
        });
      } catch (err) {
        throw err;
      }
    }

    console.log("Chunking");

    // If too large, switch to chunking
    const blob = new Blob([jsonString], { type: 'application/json' });
    const uploadId = crypto.randomUUID();
    const chunkSize = 512 * 1024; // 512KB chunks
    const totalChunks = Math.ceil(blob.size / chunkSize);

    let lastResponse: Response = {} as Response;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = blob.slice(i * chunkSize, (i + 1) * chunkSize);
      const formData = new FormData();

      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('index', i.toString());
      formData.append('isLast', (i === totalChunks - 1).toString());
      // Tell the backend WHICH API route this data is actually for
      formData.append('originalPath', path);

      lastResponse = await fetch(`${this.baseUrl}/api/chunked-upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeaders(requestId)['Authorization'] || '',
          ...(requestId ? { 'x-request-id': requestId } : {})
          // Note: Do NOT set Content-Type; browser sets multipart/form-data automatically
        },
        body: formData,
      });

      if (!lastResponse.ok) throw new Error(`Chunk ${i} failed`);
    }

    return lastResponse;
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const response = await this.smartFetch(path, body);
    return this.handleResponse<T>(response);
  }

  // ============================================
  // Job Polling Helper Methods
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async pollJobResult<TRes>(
    jobId: string,
    jobStatusPath: string,
    onProgress?: (progress: JobProgress) => void,
    requestId?: string
  ): Promise<TRes> {
    const pollIntervalMs = 2000; // Poll every 2 seconds
    const maxAttempts = 300;     // 10 minutes max (300 * 2 seconds)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      const res = await fetch(`${this.baseUrl}${jobStatusPath}/${jobId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(requestId),
      });

      const data = await this.handleResponse<{
        status: 'pending' | 'done' | 'error';
        progress?: JobProgress;
        thinkingSteps?: string[];
        result?: TRes;
        error?: string;
      }>(res);

      // Report progress if callback provided
      if (data.progress && onProgress) {
        // Merge thinkingSteps from the job-level field into the progress object
        const progressWithThinking: JobProgress = {
          ...data.progress,
          thinkingSteps: data.thinkingSteps,
        };
        onProgress(progressWithThinking);
      }

      if (data.status === 'done') {
        return data.result as TRes;
      }

      if (data.status === 'error') {
        throw new Error(data.error || 'Background job failed');
      }

      // Still pending, wait and try again
      await this.sleep(pollIntervalMs);
    }

    throw new Error('Job timed out after 10 minutes');
  }

  private async postJsonJobAware<TReq, TRes>(
    path: string,
    jobStatusPath: string,
    body: TReq,
    onProgress?: (progress: JobProgress) => void,
    requestId?: string
  ): Promise<TRes> {
    // const response = await fetch(`${this.baseUrl}${path}`, {
    //   method: 'POST',
    //   headers: this.getAuthHeaders(),
    //   body: JSON.stringify(body),
    // });
    const response = await this.smartFetch(path, body);

    // Clone response to check if it's a job response
    const clone = response.clone();
    
    try {
      const json = (await clone.json()) as any;
      
      // If response contains jobId, it's a background job
      if (json && typeof json === 'object' && typeof json.jobId === 'string') {
        return this.pollJobResult<TRes>(json.jobId, jobStatusPath, onProgress, requestId);
      }
    } catch {
      // Not JSON or no jobId, fall through to normal handling
    }

    // Normal response (not a job)
    return this.handleResponse<TRes>(response);
  }

  // ============================================
  // END OF NEW JOB POLLING METHODS
  // ============================================

  // Playbook Methods
  async getPlaybooks(page: number = 1, limit: number = 10): Promise<PlaybooksListResponse> {
    // console.log(this.getAuthHeaders());
    // console.log(this.baseUrl);
    const url = `${this.baseUrl}/api/playbooks?page=${page}&limit=${limit}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<PlaybooksListResponse>(response);
    } catch (err) {
      throw err;
    }
  }

    // Rule Rerun Methods
    async rerunRules(request: RerunRulesRequest): Promise<RerunRulesResponse> {
        const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbook-generation/rerun`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(request),
        });

        return this.handleResponse<RerunRulesResponse>(response);
    }

  async generatePlaybook(
    request: GeneratePlaybookRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<GeneratePlaybookResponse> {
    const requestId = crypto.randomUUID();
    return this.postJsonJobAware<GeneratePlaybookRequest, GeneratePlaybookResponse>(
      '/api/playbook-generation/generate',
      '/api/playbook-generation/jobs',
      request,
      onProgress,
      requestId
    );
  }
    
  // async rerunRules(request: RerunRulesRequest): Promise<StandardStringResponse> {
  //   const response = await fetch(`${this.baseUrl}/api/playbook-generation/rerun`, {
  //     method: 'POST',
  //     headers: this.getAuthHeaders(),
  //     body: JSON.stringify(request),
  //   });

  //   return this.handleResponse<StandardStringResponse>(response);
  // }

  async removeConditionInRules(request: string): Promise<StandardStringResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbook-generation/remove-conditions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<StandardStringResponse>(response);
  }

  async getPlaybook(id: string): Promise<PlaybookResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbooks/${id}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PlaybookResponse>(response);
  }

  async createPlaybook(data: CreatePlaybookRequest): Promise<PlaybookResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbooks`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<PlaybookResponse>(response);
  }

  async updatePlaybook(id: string, data: UpdatePlaybookRequest): Promise<PlaybookResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbooks/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<PlaybookResponse>(response);
  }

  async deletePlaybook(id: string): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/playbooks/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  // ============================================
  // PLAYBOOK COMBINATION METHODS
  // ============================================

  async compareRulesForCombination(
    request: CompareRulesRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<CompareRulesResponse> {
    return this.postJsonJobAware<CompareRulesRequest, CompareRulesResponse>(
      '/api/playbook-combination/compare-rules',
      '/api/playbook-combination/jobs',
      request,
      onProgress
    );
  }

  async mergeOverlappingRules(request: MergeRulesRequest): Promise<MergeRulesResponse> {
    const response = await fetch(`${this.baseUrl}/api/playbook-combination/merge-rules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<MergeRulesResponse>(response);
  }

  async reviewWithPlaybooks(
    payload: ReviewWithPlaybooksRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<ReviewWithPlaybooksResponse> {
    const requestId = crypto.randomUUID();
    return this.postJsonJobAware<ReviewWithPlaybooksRequest, ReviewWithPlaybooksResponse>(
      '/api/contract-review/contract-amendments',
      '/api/contract-review/jobs',
      payload,
      onProgress,
      requestId
    );
  }

  async explainUnappliedRule(request: ExplainUnappliedRuleRequest): Promise<ExplainUnappliedRuleResponse> {
    const response = await fetch(`${this.baseUrl}/api/contract-review/explain-unapplied-rule`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<ExplainUnappliedRuleResponse>(response);
  }

  async handleMissingLanguage(request: HandleMissingLanguageRequest): Promise<HandleMissingLanguageResponse> {
    const response = await fetch(`${this.baseUrl}/api/contract-review/handle-missing-language`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<HandleMissingLanguageResponse>(response);
  }

  async reviewWithPrecedents(
    request: ReviewWithPrecedentsRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<ReviewWithPrecedentsResponse> {
    const requestId = crypto.randomUUID();
    return this.postJsonJobAware<ReviewWithPrecedentsRequest, ReviewWithPrecedentsResponse>(
      '/api/review-with-precedents/complete',
      '/api/review-with-precedents/jobs',
      request,
      onProgress,
      requestId
    );
  }

  async classifyDocument(request: {
    paragraphs: string[];
  }): Promise<ClassifyDocumentResponse> {
    const url = `${this.baseUrl}/api/document/classify`;
    const headers = this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Classification failed');
    return data.data;
  }

  /**
   * Validate two main body candidates using LLM.
   * Returns which candidate (A or B) is the true start of the main body.
   */
  async validateMainBodyCandidates(request: {
    candidateA: { gapText: string; candidateText: string };
    candidateB: { gapText: string; candidateText: string };
  }): Promise<{ winner: 'A' | 'B' }> {
    const url = `${this.baseUrl}/api/document/validate-main-body-candidates`;
    const headers = this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Validation failed');
    return data.data;
  }

  // ============================================
  // SUMMARY GENERATION METHODS
  // ============================================

  async generateSummary(
    request: GenerateSummaryRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<GenerateSummaryResponse> {
    return this.postJsonJobAware<GenerateSummaryRequest, GenerateSummaryResponse>(
      '/api/summary-generation/generate',
      '/api/summary-generation/jobs',
      request,
      onProgress
    );
  }

  async extractPositions(request: ExtractPositionsRequest): Promise<ExtractPositionsResponse> {
    const response = await fetch(`${this.baseUrl}/api/summary-generation/extract-positions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<ExtractPositionsResponse>(response);
  }

  async rerunSummary(request: RerunSummaryRequest): Promise<RerunSummaryResponse> {
    const response = await fetch(`${this.baseUrl}/api/summary-generation/rerun`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<RerunSummaryResponse>(response);
  }

  // ============================================
  // ANNOTATION EXPLAINER METHODS
  // ============================================

  async explainAnnotations(
    request: ExplainAnnotationsRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<ExplainAnnotationsResponse> {
    return this.postJsonJobAware<ExplainAnnotationsRequest, ExplainAnnotationsResponse>(
      '/api/annotation-explainer/explain',
      '/api/annotation-explainer/jobs',
      request,
      onProgress
    );
  }
  
  // ============================================
  // NEW: RE-DRAFT METHODS
  // ============================================

  async redraft(
    request: RedraftRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<RedraftResponse> {
    return this.postJsonJobAware<RedraftRequest, RedraftResponse>(
      '/api/redraft',
      '/api/redraft/jobs',
      request,
      onProgress
    );
  }

  // ============================================
  // END OF RE-DRAFT METHODS
  // ============================================

  // ============================================
  // NEW: REDOMICILE METHODS
  // ============================================

  async redomicile(
    request: RedomicileRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<RedomicileResponse> {
    return this.postJsonJobAware<RedomicileRequest, RedomicileResponse>(
      '/api/redomicile',
      '/api/redomicile/jobs',
      request,
      onProgress
    );
  }

  // ============================================
  // END OF REDOMICILE METHODS
  // ============================================

  // ============================================
  // DRAFTING METHODS
  // ============================================

  async draftWithInstructions(
    payload: DraftWithInstructionsRequest,
    onProgress?: (progress: JobProgress) => void
  ): Promise<DraftWithInstructionsResponse> {
    return this.postJsonJobAware<DraftWithInstructionsRequest, DraftWithInstructionsResponse>(
      '/api/drafting/draft-with-instructions',
      '/api/drafting/jobs',
      payload,
      onProgress
    );
  }

  // ============================================
  // END OF DRAFTING METHODS
  // ============================================

  async prepareAnnotations(request: PrepareAnnotationsRequest): Promise<PrepareAnnotationsResponse> {
    const response = await fetch(`${this.baseUrl}/api/annotations/prepare`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<PrepareAnnotationsResponse>(response);
  }

  // ============================================
  // ASK API METHODS
  // ============================================

  async askStream(
    request: {
      question: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      sourceConfig: {
        includeDocument: boolean;
        documentContext?: string;
        vaultFileIds?: string[];
        vaultPlaybookIds?: string[];
        vaultClauseIds?: string[];
        enableWebSearch: boolean;
        selectionContext?: string;
        sessionId?: string;
        isFirstRequest?: boolean;
        fullDocument?: string;
      };
    },
    onEvent?: (event: {
      type: 'workflow_step' | 'thinking' | 'content' | 'citation' | 'follow_up' | 'error' | 'done';
      step?: number;
      total?: number;
      name?: string;
      status?: 'started' | 'completed';
      content?: string;
      text?: string;
      done?: boolean;
      id?: number;
      source?: any;
      questions?: string[];
      message?: string;
    }) => void
  ): Promise<{
    answer: string;
    citations: Array<{ id: number; source: any }>;
    followUpQuestions: string[];
  }> {
    const requestId = crypto.randomUUID();
    const askUrl = `${this.baseUrl}/api/ask/stream`;
    
    const response = await fetch(askUrl, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(requestId),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    const citations: Array<{ id: number; source: any }> = [];
    let followUpQuestions: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              if (onEvent) {
                onEvent(event);
              }

              switch (event.type) {
                case 'content':
                  if (event.text) {
                    answer += event.text;
                  }
                  break;
                case 'thinking':
                  break;
                case 'citation':
                  if (event.id && event.source) {
                    citations.push({ id: event.id, source: event.source });
                  }
                  break;
                case 'follow_up':
                  if (event.questions) {
                    followUpQuestions = event.questions;
                  }
                  break;
                case 'error':
                  throw new Error(event.message || 'Stream error');
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      answer,
      citations,
      followUpQuestions,
    };
  }

  // Get available LLM models
  async getAvailableModels(): Promise<{
    openai: string[];
    anthropic: string[];
    google: string[];
    openrouter: string[];
    ollama: string[];
    azure: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/llm/models`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  // ============================================
  // END OF ASK API METHODS
  // ============================================
  
  // ============================================
  // TRANSLATION API METHODS
  // ============================================

  async translate(request: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<{
    success: boolean;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/translate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<{
      success: boolean;
      translatedText: string;
      sourceLanguage: string;
      targetLanguage: string;
    }>(response);
  }

  async exportTranslationPdf(request: {
    text: string;
    fileName?: string;
  }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/translate/export-pdf`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const clone = response.clone();
      let errorData: any = {};
      let errorText: string | null = null;
      try {
        errorData = await clone.json();
      } catch {
        try {
          const txt = await clone.text();
          errorText = txt?.trim() ? txt.trim() : null;
        } catch {
          // ignore
        }
      }

      throw new Error(
        errorData?.error?.message ||
          errorText ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.blob();
  }

  // ============================================
  // END OF TRANSLATION API METHODS
  // ============================================
  
  // Definition Checker Methods
  async analyzeDefinitions(
    parsedDocument: ParsedDocument,
    language: string = 'english'
  ): Promise<DefinitionCheckResult> {
    const response = await fetch(`${this.baseUrl}/api/definition-checker/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        structure: parsedDocument.structure,
        recitals: parsedDocument.recitals,
        documentName: parsedDocument.documentName,
        definitionSection: parsedDocument.definitionSection,
        language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async generateDefinition(
    term: string,
    occurrences: Array<{ sentence: string; sectionReference: string }>,
    parsedDocument: ParsedDocument
  ): Promise<GenerateDefinitionResult> {
    const response = await fetch(`${this.baseUrl}/api/definition-checker/generate-definition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        term,
        occurrences: occurrences.slice(0, 5),
        structure: parsedDocument.structure,
        recitals: parsedDocument.recitals,
        definitionSection: parsedDocument.definitionSection,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  async resolveDuplicateDefinitions(
    term: string,
    occurrences: Array<{ sentence: string; sectionReference: string }>,
    parsedDocument: ParsedDocument,
    previousAmendments?: ResolveDuplicateAmendment[]
  ): Promise<ResolveDuplicatesResult> {
    const response = await fetch(`${this.baseUrl}/api/definition-checker/resolve-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        term,
        occurrences,
        structure: parsedDocument.structure,
        recitals: parsedDocument.recitals,
        previousAmendments,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // async checkDefinitionCheckerHealth(): Promise<{ status: string; service: string; timestamp: string }> {
  //   const response = await fetch(`${this.baseUrl}/api/definition-checker/health`, {
  //     method: "GET",
  //     headers: this.getAuthHeaders(),
  //   });

  //   return this.handleResponse<{ status: string; service: string; timestamp: string }>(response);
  // }

  // async contractChat(payload: {
  //   selectedText: string;
  //   userQuestion: string;
  //   conversationHistory?: Array<{
  //     type: 'user' | 'ai';
  //     content: string;
  //   }>;
  // }): Promise<StandardStringResponse> {
  //   const response = await fetch(`${this.baseUrl}/api/contract-chat`, {
  //     method: 'POST',
  //     headers: this.getAuthHeaders(),
  //     body: JSON.stringify(payload),
  //   });

  //   return this.handleResponse<StandardStringResponse>(response);
  // }

  // Authentication Methods
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          code: errorData.error?.code,
          statusCode: response.status,
        },
      };
    }

    // API returns { user, token, expiresAt } - normalize to expected structure
    const apiResponse = await response.json();

    // Store token and user info immediately
    if (apiResponse.token) {
      localStorage.setItem("authToken", apiResponse.token);
      if (apiResponse.user?.id) {
        localStorage.setItem("userId", apiResponse.user.id);
      }
    }

    return {
      success: true,
      data: {
        user: apiResponse.user,
        token: apiResponse.token,
      },
    };
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // API returns { user, token, expiresAt } - normalize to expected structure
    const apiResponse = await response.json();

    const loginResponse: LoginResponse = {
      data: {
        token: apiResponse.token,
        expiresIn: apiResponse.expiresAt,
        user: apiResponse.user,
      },
    };

    // Store token and user.id in localStorage
    if (loginResponse.data?.token) {
      localStorage.setItem("authToken", loginResponse.data.token);
      if (loginResponse.data.user?.id) {
        localStorage.setItem("userId", loginResponse.data.user.id);
      }
    }

    return loginResponse;
  }

  async getMe(): Promise<GetMeResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  // API returns { user: {...} } - normalize to expected structure
  const apiResponse = await response.json();
  const user = apiResponse.user;

  return {
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId || null,
      organization: user.organization || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Map subscription object to active_subscription_id
      // If subscription is an object with an id, use it; otherwise null
      active_subscription_id: user.subscription?.id || user.active_subscription_id || null,
      // Preserve the full subscription object if available
      subscription: user.subscription || null,
    },
  };
  }

  async updateMe(updates: { name?: string; email?: string }): Promise<GetMeResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // API returns { user: {...} } - normalize to expected structure
    const apiResponse = await response.json();
    const user = apiResponse.user;

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId || null,
        organization: user.organization || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        active_subscription_id: user.subscription?.id || user.active_subscription_id || null,
        subscription: user.subscription || null,
      },
    };
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<CreateSubscriptionResponse>(response);
  }

  setAuthToken(token: string): void {
    localStorage.setItem("authToken", token.trim());
  }

  getAuthToken(): string | null {
    return localStorage.getItem("authToken");
  }

  getTokenExpiresIn(): string | null {
    return localStorage.getItem("tokenExpiresIn");
  }

  getUserId(): string | null {
    return localStorage.getItem("userId");
  }

  clearAuthToken(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tokenExpiresIn");
    localStorage.removeItem("userId");
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Notifications API
  async getNotifications(page = 1, limit = 50): Promise<{
    data: Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string;
      metadata: any;
      isRead: boolean;
      createdAt: string;
    }>;
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/notifications?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async markNotificationAsRead(notificationId: string): Promise<{ data: any }> {
    const response = await fetch(
      `${this.baseUrl}/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/notifications/read-all`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/notifications/${notificationId}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  // ============================================
  // REDACTION METHODS
  // ============================================

  async suggestRedactionTerms(
    structure: any[],
    recitals: string,
  ): Promise<{
    success: boolean;
    terms: Array<{ term: string; category: string }>;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/redaction/suggest-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({ structure, recitals }),
    });
    return response.json();
  }
}

export const backendApi = new BackendApiService({
  baseUrl: process.env.REACT_APP_API_BASE_URL ?? ""
})

/**
 * Helper function to get auth headers for direct fetch calls
 * Use this when making fetch calls outside of BackendApiService
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken")?.trim();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};