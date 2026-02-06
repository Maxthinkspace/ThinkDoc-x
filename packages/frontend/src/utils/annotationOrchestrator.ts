import { parseDocumentWithRanges } from '@/src/services/documentParser';
import { extractCommentsFromOOXML } from '@/src/utils/commentExtractor';
import { extractHighlightsFromOOXML } from '@/src/utils/highlightExtractor';
import { extractTrackChanges } from '@/src/utils/trackChangeExtractor';
import { filterAnnotations } from '@/src/utils/annotationFilter';
import type { ParsedDocumentWithRanges, DocumentNodeWithRange } from '@/src/types/documents';
import type { CommentExtractionResult, CommentExtractionResults } from '@/src/types/documents';
import type { HighlightExtractionResult, HighlightExtractionResults } from '@/src/types/documents';
import type { TrackChangeExtractionResults } from '@/src/types/documents';
import type { AnnotationScope } from '@/src/types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '@/src/types/annotationScope';
import type { FilterableAnnotations } from './annotationFilter';

// ============================================
// TYPES
// ============================================

export interface ExtractionOptions {
  includeComments?: boolean;
  includeHighlights?: boolean;
  includeTrackChanges?: boolean;
}

export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  includeComments: true,
  includeHighlights: true,
  includeTrackChanges: true,
};

export interface ExtractedAnnotations {
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
}

export interface OrchestrationResult {
  // Raw extraction results
  raw: {
    comments: CommentExtractionResults;
    highlights: HighlightExtractionResults;
    trackChanges: TrackChangeExtractionResults;
  };
  
  // Filtered annotations (after scope applied)
  filtered: ExtractedAnnotations;
  
  // Document structure
  parsedDocument: ParsedDocumentWithRanges;
  combinedStructure: DocumentNodeWithRange[];
  recitals: string;
  
  // Summary counts
  summary: {
    totalAnnotations: number;
    comments: number;
    highlights: number;
    wordLevelTrackChanges: number;
    fullSentenceDeletions: number;
    fullSentenceInsertions: number;
    structuralChanges: number;
  };
}

// ============================================
// EMPTY RESULTS HELPERS
// ============================================

const EMPTY_COMMENTS_RESULT: CommentExtractionResults = {
  comments: [],
  summary: { 
    totalComments: 0, 
    totalReplies: 0, 
    totalAffectedSentences: 0 
  },
};

const EMPTY_HIGHLIGHTS_RESULT: HighlightExtractionResults = {
  highlights: [],
  summary: { 
    totalHighlights: 0 
  },
};

const EMPTY_TRACK_CHANGES_RESULT: TrackChangeExtractionResults = {
  wordLevelTrackChanges: [],
  fullSentenceDeletions: [],
  fullSentenceInsertions: [],
  structuralChanges: [],
  summary: {
    totalSentencesWithChanges: 0,
    totalFullSentenceDeletions: 0,
    totalFullSentenceInsertions: 0,
    totalDeletions: 0,
    totalInsertions: 0,
    totalSectionsDeleted: 0,
    totalSectionsInserted: 0,
  },
};

// ============================================
// HELPER: Extract part from Flat OPC
// ============================================

function extractPartFromFlatOPC(flatOpc: Document, partName: string): Document | null {
  const parts = flatOpc.getElementsByTagNameNS('*', 'part');
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const name = part.getAttributeNS('http://schemas.microsoft.com/office/2006/xmlPackage', 'name') 
      || part.getAttribute('pkg:name');
    
    if (name === partName) {
      const xmlData = part.getElementsByTagNameNS('*', 'xmlData')[0];
      if (xmlData && xmlData.firstElementChild) {
        const serializer = new XMLSerializer();
        const partXml = serializer.serializeToString(xmlData.firstElementChild);
        return new DOMParser().parseFromString(partXml, 'text/xml');
      }
    }
  }
  return null;
}

// ============================================
// MAIN ORCHESTRATION FUNCTION
// ============================================

/**
 * Extract and filter annotations from the document.
 * Single entry point for all features (playbook, summary, explainer).
 */
export async function extractAndFilterAnnotations(
  scope: AnnotationScope = DEFAULT_ANNOTATION_SCOPE,
  options: ExtractionOptions = DEFAULT_EXTRACTION_OPTIONS
): Promise<OrchestrationResult> {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  
  console.log('[annotationOrchestrator] Starting extraction...');
  console.log(`[annotationOrchestrator] Scope: mode=${scope.mode}, ranges=${scope.ranges.length}`);
  console.log(`[annotationOrchestrator] Options: comments=${opts.includeComments}, highlights=${opts.includeHighlights}, trackChanges=${opts.includeTrackChanges}`);

  // Step 1: Parse document and extract annotations in single Word.run context
  const { parsedDoc, commentsResult, highlightsResult, trackChangesResult } = await Word.run(async (context) => {
    const parsedDoc = await parseDocumentWithRanges(context);
    console.log(`[annotationOrchestrator] Parsed ${parsedDoc.structure.length} top-level sections`);

    // Get OOXML once (only if needed for comments or highlights)
    let xmlDoc: Document | null = null;
    let commentsXmlDoc: Document | null = null;

    if (opts.includeComments || opts.includeHighlights) {
      const body = context.document.body;
      const ooxml = body.getOoxml();
      await context.sync();
      
      const xmlParser = new DOMParser();
      const flatOpcDoc = xmlParser.parseFromString(ooxml.value, "text/xml");
      xmlDoc = extractPartFromFlatOPC(flatOpcDoc, '/word/document.xml') || flatOpcDoc;
      
      if (opts.includeComments) {
        commentsXmlDoc = extractPartFromFlatOPC(flatOpcDoc, '/word/comments.xml');
      }
    }

    // Extract based on options
    const commentsResult = opts.includeComments && xmlDoc
      ? extractCommentsFromOOXML(xmlDoc, commentsXmlDoc, parsedDoc.combinedStructure)
      : EMPTY_COMMENTS_RESULT;

    const highlightsResult = opts.includeHighlights && xmlDoc
      ? extractHighlightsFromOOXML(xmlDoc, parsedDoc.combinedStructure)
      : EMPTY_HIGHLIGHTS_RESULT;

    const trackChangesResult = opts.includeTrackChanges
      ? await extractTrackChanges(context, parsedDoc)
      : EMPTY_TRACK_CHANGES_RESULT;

    return { parsedDoc, commentsResult, highlightsResult, trackChangesResult };
  });

  console.log(`[annotationOrchestrator] Extracted (before filtering):`);
  console.log(`  - ${commentsResult.summary.totalComments} comments`);
  console.log(`  - ${highlightsResult.summary.totalHighlights} highlights`);
  console.log(`  - ${trackChangesResult.summary.totalSentencesWithChanges} word-level track changes`);
  console.log(`  - ${trackChangesResult.summary.totalFullSentenceDeletions} full-sentence deletions`);
  console.log(`  - ${trackChangesResult.summary.totalFullSentenceInsertions} full-sentence insertions`);

  // Step 2: Apply scope filters
  console.log('[annotationOrchestrator] Applying filters...');
  const filtered = filterAnnotations(
    {
      comments: commentsResult.comments,
      highlights: highlightsResult.highlights,
      trackChanges: trackChangesResult,
    },
    scope
  );

  // Build summary
  const summary = {
    totalAnnotations:
      filtered.comments.length +
      filtered.highlights.length +
      filtered.trackChanges.summary.totalSentencesWithChanges +
      filtered.trackChanges.summary.totalFullSentenceDeletions +
      filtered.trackChanges.summary.totalFullSentenceInsertions,
    comments: filtered.comments.length,
    highlights: filtered.highlights.length,
    wordLevelTrackChanges: filtered.trackChanges.summary.totalSentencesWithChanges,
    fullSentenceDeletions: filtered.trackChanges.summary.totalFullSentenceDeletions,
    fullSentenceInsertions: filtered.trackChanges.summary.totalFullSentenceInsertions,
    structuralChanges: filtered.trackChanges.structuralChanges.length,
  };

  console.log(`[annotationOrchestrator] After filtering: ${summary.totalAnnotations} total annotations`);

  return {
    raw: {
      comments: commentsResult,
      highlights: highlightsResult,
      trackChanges: trackChangesResult,
    },
    filtered: {
      comments: filtered.comments,
      highlights: filtered.highlights,
      trackChanges: filtered.trackChanges,
    },
    parsedDocument: parsedDoc,
    combinedStructure: parsedDoc.combinedStructure,
    recitals: parsedDoc.recitals,
    summary,
  };
}

/**
 * Validate that there are annotations to process.
 * Throws if no annotations found.
 */
export function validateAnnotationsExist(result: OrchestrationResult): void {
  if (result.summary.totalAnnotations === 0) {
    throw new Error('No annotations found after filtering. Please add comments, highlights, or track changes.');
  }
}