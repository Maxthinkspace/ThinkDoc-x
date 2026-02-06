import { extractAndFilterAnnotations } from '@/src/utils/annotationOrchestrator';
import type { OrchestrationResult, ExtractionOptions } from '@/src/utils/annotationOrchestrator';
import type { AnnotationScope } from '@/src/types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '@/src/types/annotationScope';
import type { FullClassificationOutput } from '@/src/types/annotation-classifier';
import { backendApi } from '@/src/services/api';
import { reconcileAnnotationSelections, scopeHasSelections } from '@/src/utils/annotationReconciliation';
import type { ReconciliationResult, ReconciliationSummary } from '@/src/utils/annotationReconciliation';
import type { FilterableAnnotations } from '@/src/utils/annotationFilter';
import type { ParsedDocument, DocumentNode, DocumentNodeWithRange } from '@/src/types/documents';

// ============================================
// TYPES
// ============================================

interface ExtractedPosition {
  party: string;
  position: string;
}

interface CachedData {
  orchestrationResult: OrchestrationResult;
  classificationResult: FullClassificationOutput | null;
  positions: { positions: ExtractedPosition[]; normalized: string[] } | null;
  timestamp: number;
  documentHash: string;
}

interface CacheOptions {
  scope?: AnnotationScope;
  extractionOptions?: ExtractionOptions;
  forceRefresh?: boolean;
}

/** Result returned when refreshing with reconciliation */
export interface RefreshWithReconciliationResult {
  orchestrationResult: OrchestrationResult;
  reconciliation: ReconciliationResult | null;
  documentChanged: boolean;
}

// ============================================
// DOCUMENT HASH
// ============================================

async function generateDocumentHash(): Promise<string> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load('items');
    await context.sync();

    const count = paragraphs.items.length;
    if (count === 0) return 'empty';

    const first = paragraphs.items[0];
    const last = paragraphs.items[count - 1];
    first.load('text');
    last.load('text');
    await context.sync();

    const firstText = (first.text || '').substring(0, 100);
    const lastText = (last.text || '').substring(0, 100);

    const hash = `${count}:${firstText}:${lastText}`;
    console.log('[DocumentCache] Generated document hash:', {
      paragraphCount: count,
      firstTextPreview: firstText.substring(0, 50) + '...',
      lastTextPreview: lastText.substring(0, 50) + '...',
    });

    return hash;
  });
}

// ============================================
// DOCUMENT CACHE SINGLETON
// ============================================

class DocumentCache {
  private cache: CachedData | null = null;
  private pendingRequest: Promise<OrchestrationResult> | null = null;
  private pendingClassification: Promise<FullClassificationOutput | null> | null = null;
  
  /**
   * Get cached orchestration result, or parse if needed.
   */
  async getOrchestrationResult(options: CacheOptions = {}): Promise<OrchestrationResult> {
    const {
      scope = DEFAULT_ANNOTATION_SCOPE,
      extractionOptions,
      forceRefresh = false,
    } = options;

    const currentHash = await generateDocumentHash();
    const cacheValid = this.cache &&
                       this.cache.documentHash === currentHash &&
                       !forceRefresh;

    if (cacheValid && this.cache) {
      console.log('[DocumentCache] Returning cached result');
      this.logCachedAnnotations(this.cache.orchestrationResult);
      return this.cache.orchestrationResult;
    }

    // Log why cache is invalid
    if (this.cache && this.cache.documentHash !== currentHash) {
      console.log('[DocumentCache] Cache invalid - document hash changed');
      console.log('[DocumentCache]   Old hash:', this.cache.documentHash);
      console.log('[DocumentCache]   New hash:', currentHash);
    } else if (forceRefresh) {
      console.log('[DocumentCache] Cache bypassed - force refresh requested');
    } else {
      console.log('[DocumentCache] Cache empty - first extraction');
    }

    if (this.pendingRequest) {
      console.log('[DocumentCache] Waiting for pending request');
      return this.pendingRequest;
    }

    console.log('[DocumentCache] ========== EXTRACTING ANNOTATIONS ==========');

    this.pendingRequest = extractAndFilterAnnotations(scope, extractionOptions)
      .then((result) => {
        this.cache = {
          orchestrationResult: result,
          classificationResult: null, // Reset classification when document changes
          positions: null,
          timestamp: Date.now(),
          documentHash: currentHash,
        };
        this.pendingRequest = null;
        console.log('[DocumentCache] Cached new result at', new Date().toISOString());
        this.logCachedAnnotations(result);
        return result;
      })
      .catch((error) => {
        this.pendingRequest = null;
        throw error;
      });

    return this.pendingRequest;
  }

  /**
   * Refresh the cache and reconcile user selections.
   * This is the main method to use when you need to preserve selections after document changes.
   */
  async refreshWithReconciliation(
    currentScope: AnnotationScope,
    options: Omit<CacheOptions, 'forceRefresh'> = {}
  ): Promise<RefreshWithReconciliationResult> {
    console.log('[DocumentCache] ========== REFRESH WITH RECONCILIATION ==========');

    // Check if document has changed
    const currentHash = await generateDocumentHash();
    const documentChanged = !this.cache || this.cache.documentHash !== currentHash;

    console.log('[DocumentCache] Document changed:', documentChanged);

    // Force refresh to get new annotations
    const orchestrationResult = await this.getOrchestrationResult({
      ...options,
      forceRefresh: true,
    });

    // If no selections or document didn't change, no reconciliation needed
    if (!scopeHasSelections(currentScope)) {
      console.log('[DocumentCache] No selections to reconcile (mode is "all" or no ranges)');
      return {
        orchestrationResult,
        reconciliation: null,
        documentChanged,
      };
    }

    // Build FilterableAnnotations from orchestration result
    const newAnnotations: FilterableAnnotations = {
      comments: orchestrationResult.filtered.comments,
      highlights: orchestrationResult.filtered.highlights,
      trackChanges: orchestrationResult.filtered.trackChanges,
    };

    // Reconcile selections
    const reconciliation = reconcileAnnotationSelections(currentScope, newAnnotations);

    return {
      orchestrationResult,
      reconciliation,
      documentChanged,
    };
  }

  /**
   * Log all cached annotations for debugging.
   */
  private logCachedAnnotations(result: OrchestrationResult): void {
    const { filtered, summary } = result;

    console.log('[DocumentCache] ========== CACHED ANNOTATIONS ==========');
    console.log('[DocumentCache] Summary:', summary);

    console.log(`[DocumentCache] COMMENTS (${filtered.comments.length}):`);
    for (const c of filtered.comments) {
      console.log(`[DocumentCache]   - ${c.commentId} | Section: ${c.sectionNumber}`);
      console.log(`[DocumentCache]       Selected: "${c.selectedText.substring(0, 50)}..."`);
      console.log(`[DocumentCache]       Content: "${c.commentContent.substring(0, 50)}..."`);
      console.log(`[DocumentCache]       Author: ${c.author}`);
    }

    console.log(`[DocumentCache] HIGHLIGHTS (${filtered.highlights.length}):`);
    for (const h of filtered.highlights) {
      console.log(`[DocumentCache]   - ${h.highlightId} | Section: ${h.sectionNumber} | Color: ${h.highlightColor}`);
      console.log(`[DocumentCache]       Text: "${h.selectedText.substring(0, 50)}..."`);
    }

    const tc = filtered.trackChanges;
    console.log(`[DocumentCache] WORD-LEVEL TRACK CHANGES (${tc.wordLevelTrackChanges.length}):`);
    for (const wltc of tc.wordLevelTrackChanges) {
      const deleted = wltc.deleted.map(d => d.text).join(', ');
      const added = wltc.added.map(a => a.text).join(', ');
      console.log(`[DocumentCache]   - ${wltc.sentenceId} | Section: ${wltc.sectionNumber}`);
      console.log(`[DocumentCache]       Deleted: "${deleted}"`);
      console.log(`[DocumentCache]       Added: "${added}"`);
    }

    console.log(`[DocumentCache] FULL SENTENCE DELETIONS (${tc.fullSentenceDeletions.length}):`);
    for (const fsd of tc.fullSentenceDeletions) {
      console.log(`[DocumentCache]   - ${fsd.id} | Section: ${fsd.sectionNumber}`);
      console.log(`[DocumentCache]       Text: "${fsd.deletedText.substring(0, 50)}..."`);
    }

    console.log(`[DocumentCache] FULL SENTENCE INSERTIONS (${tc.fullSentenceInsertions.length}):`);
    for (const fsi of tc.fullSentenceInsertions) {
      console.log(`[DocumentCache]   - ${fsi.id} | Section: ${fsi.sectionNumber || fsi.inferredTopLevelSection}`);
      console.log(`[DocumentCache]       Text: "${fsi.insertedText.substring(0, 50)}..."`);
    }

    const scCount = tc.structuralChanges?.length || 0;
    console.log(`[DocumentCache] STRUCTURAL CHANGES (${scCount}):`);
    for (const sc of tc.structuralChanges || []) {
      console.log(`[DocumentCache]   - ${sc.type} | Section: ${sc.sectionNumber}`);
      console.log(`[DocumentCache]       Title: "${sc.sectionTitle}"`);
    }

    console.log('[DocumentCache] ========== END CACHED ANNOTATIONS ==========');
  }

  /**
   * Get classification result, running classification if not cached.
   * This should be called AFTER getOrchestrationResult.
   */
  async getClassificationResult(options: CacheOptions = {}): Promise<FullClassificationOutput | null> {
    const { forceRefresh = false } = options;

    // IMPORTANT: Get orchestration result WITHOUT forcing refresh
    // We only want to force re-classification, not re-extraction.
    // Re-extraction would generate new annotation IDs and break reconciliation.
    const orchestrationResult = await this.getOrchestrationResult({
      ...options,
      forceRefresh: false, // Never force re-extraction here
    });

    // Return cached classification if available
    if (this.cache?.classificationResult && !forceRefresh) {
      console.log('[DocumentCache] Returning cached classification');
      return this.cache.classificationResult;
    }

    // If already running classification, wait for it
    if (this.pendingClassification) {
      console.log('[DocumentCache] Waiting for pending classification');
      return this.pendingClassification;
    }

    // Check if there are annotations to classify
    if (orchestrationResult.summary.totalAnnotations === 0) {
      console.log('[DocumentCache] No annotations to classify');
      return null;
    }

    console.log('[DocumentCache] Running classification...');

    this.pendingClassification = backendApi.prepareAnnotations({
      parsedDocument: orchestrationResult.parsedDocument,
      comments: orchestrationResult.filtered.comments,
      highlights: orchestrationResult.filtered.highlights,
      trackChanges: orchestrationResult.filtered.trackChanges,
      recitals: orchestrationResult.recitals,
    })
      .then((response) => {
        if (response.success) {
          if (response.classificationResult) {
            this.setClassificationResult(response.classificationResult);
          }
          if (response.positions) {
            this.setPositions(response.positions);
          }
          return response.classificationResult || null;
        }
        return null;
      })
      .catch((error) => {
        console.error('[DocumentCache] Classification failed:', error);
        return null;
      })
      .finally(() => {
        this.pendingClassification = null;
      });

    return this.pendingClassification;
  }

  /**
   * Get both orchestration and classification in one call.
   * Convenience method for components that need everything.
   */
  async getFullResult(options: CacheOptions = {}): Promise<{
    orchestrationResult: OrchestrationResult;
    classificationResult: FullClassificationOutput | null;
  }> {
    const orchestrationResult = await this.getOrchestrationResult(options);
    const classificationResult = await this.getClassificationResult(options);
    return { orchestrationResult, classificationResult };
  }
  
  /**
   * Get just the parsed document (with ranges).
   */
  async getParsedDocument(options: CacheOptions = {}) {
    const result = await this.getOrchestrationResult(options);
    return result.parsedDocument;
  }

  /**
   * Get parsed document without ranges (for backend API calls).
   * This strips Word.js Range objects to create a serializable structure.
   */
  async getParsedDocumentSimple(options: CacheOptions = {}): Promise<ParsedDocument> {
    const result = await this.getOrchestrationResult(options);
    const fullDoc = result.parsedDocument;

    // Strip range-related fields to return simple ParsedDocument
    const stripRanges = (nodes: DocumentNodeWithRange[]): DocumentNode[] => {
      return nodes.map(node => ({
        sectionNumber: node.sectionNumber,
        originalDisplayNumber: node.originalDisplayNumber,
        amendedDisplayNumber: node.amendedDisplayNumber,
        sectionHeading: node.sectionHeading,
        originalSectionHeading: node.originalSectionHeading,
        combinedSectionHeading: node.combinedSectionHeading,
        text: node.text,
        originalText: node.originalText,
        combinedText: node.combinedText,
        level: node.level,
        additionalParagraphs: node.additionalParagraphs,
        originalAdditionalParagraphs: node.originalAdditionalParagraphs,
        combinedAdditionalParagraphs: node.combinedAdditionalParagraphs,
        additionalParagraphStatuses: node.additionalParagraphStatuses,
        children: node.children ? stripRanges(node.children) : [],
        wordIndices: node.wordIndices,
        ooxmlIndices: node.ooxmlIndices,
        paragraphStatus: node.paragraphStatus,
      }));
    };

    return {
      recitals: fullDoc.recitals,
      structure: stripRanges(fullDoc.structure),
      signatures: fullDoc.signatures,
      appendices: fullDoc.appendices,
      badFormatSections: fullDoc.badFormatSections,
      documentName: fullDoc.documentName,
      definitionSection: fullDoc.definitionSection,
      documentType: fullDoc.documentType,
    };
  }

  /**
   * Get filtered annotations.
   */
  async getFilteredAnnotations(options: CacheOptions = {}) {
    const result = await this.getOrchestrationResult(options);
    return result.filtered;
  }
  
  /**
   * Get recitals.
   */
  async getRecitals(options: CacheOptions = {}): Promise<string> {
    const result = await this.getOrchestrationResult(options);
    return result.recitals;
  }
  
  /**
   * Invalidate cache.
   */
  invalidate(): void {
    console.log('[DocumentCache] Cache invalidated');
    this.cache = null;
  }
  
  /**
   * Check if cache is valid.
   */
  async isCacheValid(): Promise<boolean> {
    if (!this.cache) return false;
    const currentHash = await generateDocumentHash();
    return this.cache.documentHash === currentHash;
  }
  
  /**
   * Get cache timestamp.
   */
  getCacheTimestamp(): number | null {
    return this.cache?.timestamp || null;
  }

  /**
   * Get cached classification (synchronous, returns null if not cached).
   */
  getCachedClassification(): FullClassificationOutput | null {
    return this.cache?.classificationResult || null;
  }

  /**
   * Store classification result.
   */
  setClassificationResult(result: FullClassificationOutput): void {
    if (this.cache) {
      this.cache.classificationResult = result;
      console.log('[DocumentCache] Stored classification result');
    }
  }

  /**
   * Check if classification is cached.
   */
  hasClassificationResult(): boolean {
    return this.cache?.classificationResult !== null;
  }

  /**
   * Get cached positions (synchronous).
   */
  getCachedPositions(): { positions: ExtractedPosition[]; normalized: string[] } | null {
    return this.cache?.positions || null;
  }

  /**
   * Store positions result.
   */
  setPositions(result: { positions: ExtractedPosition[]; normalized: string[] }): void {
    if (this.cache) {
      this.cache.positions = result;
      console.log('[DocumentCache] Stored positions result');
    }
  }

  /**
   * Check if positions are cached.
   */
  hasPositions(): boolean {
    return this.cache?.positions !== null;
  }
}

export const documentCache = new DocumentCache();

export type { CacheOptions, CachedData };
export type { ReconciliationResult, ReconciliationSummary } from '@/src/utils/annotationReconciliation';