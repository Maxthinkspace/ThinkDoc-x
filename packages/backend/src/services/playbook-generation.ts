import { logger } from '@/config/logger';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import { v4 as uuidv4 } from 'uuid';
import {
  generateCARulesPrompt,
  generateIRRulesPrompt,
  expandRulePrompt,
  removeConditionPrompt,
  rerunRulesPrompt,
} from '@/controllers/playbook-generation-prompts';
import { buildFullSectionText, findTopLevelSection, findSection } from '@/services/sentence-extractor';
import type { SectionNode } from '@/types/documents';
import type {
  CommentExtractionResult,
  HighlightExtractionResult,
  TrackChangeExtractionResults,
  NormalizedAnnotation,
  CommentForLLM,
  HighlightForLLM,
  TrackChangeForLLM,
  FullSentenceDeletionForLLM,
  FullSentenceInsertionForLLM,
  Batch,
  GeneratedRule,
  RuleCategory,
  RuleCategoryType,
  ClassifiedRules,
  RuleRerunContextMap,
  RuleRerunRequest,
  RuleRerunResult,
} from '@/types/playbook-generation';

import type { FullClassificationOutput } from '@/types/annotation-classifier';

// ============================================
// CLASSIFIER IMPORTS
// ============================================
import {
  classifyAnnotationsStage1,
  getSubstantiveAnnotations,
  getQueryAnnotations,
  getEditorialAnnotations,
} from '@/controllers/annotation-classifier';
import type { ClassifierOutput } from '@/types/annotation-classifier';

// ============================================
// TEST MODE CONFIGURATION
// ============================================
interface TestModeConfig {
  skipAllLLM: boolean;
  skipRuleGeneration: boolean;
  logClassification: boolean;
  logFormattedAnnotations: boolean;
}

const TEST_MODE: TestModeConfig | null = {
  skipAllLLM: false,
  skipRuleGeneration: false,
  logClassification: true,
  logFormattedAnnotations: true,
};

const MAX_ANNOTATIONS_PER_GROUP = 5;
const MAX_ANNOTATIONS_PER_COMBINED_BATCH = 8;

// ============================================
// SECTION NUMBER UTILITIES
// ============================================

/**
 * Parse a section number string into an array of numeric parts.
 * e.g. "8.2.2.1." → [8, 2, 2, 1], "8.2" → [8, 2]
 */
function parseSectionNumber(s: string): number[] {
  if (!s) return [];
  return s
    .replace(/\.$/, '') // strip trailing dot
    .split('.')
    .map(part => Number.parseInt(part, 10))
    .filter(n => !Number.isNaN(n));
}

/**
 * Compare two section number strings for sorting.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Empty strings sort before any numbered section.
 */
function compareSectionNumbers(a: string, b: string): number {
  const partsA = parseSectionNumber(a);
  const partsB = parseSectionNumber(b);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// ============================================
// STEP 1: NORMALIZE ANNOTATIONS
// ============================================

/**
 * Convert outputs from frontend extractors to normalized annotations with sentence IDs
 */
export function normalizeAnnotations(
  comments: CommentExtractionResult[],
  highlights: HighlightExtractionResult[],
  trackChanges: TrackChangeExtractionResults
): NormalizedAnnotation[] {
  const annotations: NormalizedAnnotation[] = [];

  // Normalize comments
  for (const comment of comments) {
    const data: CommentForLLM = {
      commentId: comment.commentId,
      commentContent: comment.commentContent,
      replies: comment.replies.map((r) => r.content),
      selectedText: comment.selectedText,
      affectedSentences: comment.affectedSentences.map((s) => s.sentence),
      affectedSentenceFragments: comment.affectedSentences.map((s) => s.sourceComponents || []),
    };

    annotations.push({
      type: 'comment',
      sentenceIds: comment.affectedSentences.map((s) => s.sentenceId),
      sectionNumber: comment.sectionNumber || '',
      topLevelSectionNumber: comment.topLevelSectionNumbers?.[0] || '',
      sourceAnnotationType: 'comment',
      data,
    });
  }

  // Normalize highlights
  for (const highlight of highlights) {
    const data: HighlightForLLM = {
      highlightId: highlight.highlightId,
      selectedText: highlight.selectedText,
      affectedSentences: highlight.affectedSentences.map(s => s.sentence),
      affectedSentenceFragments: highlight.affectedSentences.map(s => s.sourceComponents || []),
    };

    annotations.push({
      type: 'highlight',
      sentenceIds: highlight.affectedSentences.map(s => s.sentenceId),
      sectionNumber: highlight.sectionNumber || '',
      topLevelSectionNumber: highlight.topLevelSectionNumbers?.[0] || '',
      sourceAnnotationType: 'highlight',
      data,
    });
  }

  // Normalize word-level track changes
  for (const tc of trackChanges.wordLevelTrackChanges) {
    const data: TrackChangeForLLM = {
      sentenceId: tc.sentenceId,
      originalSentence: tc.originalSentence,
      amendedSentence: tc.amendedSentence,
      added: tc.added.map((a) => ({ text: a.text, startOffset: a.startOffset })),
      deleted: tc.deleted.map((d) => ({ text: d.text, startOffset: d.startOffset })),
      ...(tc.sentenceFragments ? { sentenceFragments: tc.sentenceFragments } : {}),
    };

    annotations.push({
      type: 'wordLevelTrackchange',
      sentenceIds: [tc.sentenceId],
      sectionNumber: tc.sectionNumber || '',
      topLevelSectionNumber: tc.topLevelSectionNumber,
      sourceAnnotationType: 'trackChange',
      data,
    });
  }

  // Normalize full paragraph deletions
  for (const fsd of trackChanges.fullSentenceDeletions) {
    const data: FullSentenceDeletionForLLM = {
      id: fsd.id,  
      deletedText: fsd.deletedText,
    };

    annotations.push({
      type: 'fullSentenceDeletion',
      sentenceIds: [],
      sectionNumber: fsd.sectionNumber || '',
      topLevelSectionNumber: fsd.topLevelSectionNumber || 'unknown',
      sourceAnnotationType: 'trackChange',
      data,
    });
  }

  // Normalize full sentence insertions
  for (const fsi of trackChanges.fullSentenceInsertions || []) {
    const data: FullSentenceInsertionForLLM = {
      id: fsi.id,  
      insertedText: fsi.insertedText,
    };

    annotations.push({
      type: 'fullSentenceInsertion',
      sentenceIds: [],
      sectionNumber: fsi.sectionNumber || '',
      topLevelSectionNumber: fsi.inferredTopLevelSection || 'unknown',
      sourceAnnotationType: 'trackChange',
      data,
    });
  }

  return annotations;
}

// ============================================
// STEP 2: CLASSIFY ANNOTATIONS
// ============================================

export interface ClassificationResult {
  classifierOutput: ClassifierOutput;
  substantiveAnnotations: NormalizedAnnotation[];
  queryAnnotations: NormalizedAnnotation[];
  editorialAnnotations: NormalizedAnnotation[];
}

export async function classifyAndFilterAnnotations(
  annotations: NormalizedAnnotation[],
  jobId: string
): Promise<ClassificationResult> {
  const classifierOutput = await classifyAnnotationsStage1(annotations, jobId, { logResults: true });

  return {
    classifierOutput,
    substantiveAnnotations: getSubstantiveAnnotations(annotations, classifierOutput),
    queryAnnotations: getQueryAnnotations(annotations, classifierOutput),
    editorialAnnotations: getEditorialAnnotations(annotations, classifierOutput),
  };
}

// ============================================
// STEP 4: FORMAT FOR PROMPT & GENERATE RULES
// ============================================

/**
 * Format annotations for the LLM prompt
 */
export function formatAnnotationsForPrompt(annotations: NormalizedAnnotation[]): string {
  return annotations
    .map((annotation, index) => {
      let formatted = `\n--- Annotation ${index + 1} ---\n`;

      switch (annotation.type) {
        case 'comment': {
          const data = annotation.data as CommentForLLM;
          formatted += `Annotation Type: Comment\n`;
          formatted += `Selected Text: "${data.selectedText}"\n`;
          formatted += `Comment: "${data.commentContent}"\n`;
          if (data.replies.length > 0) {
            formatted += `Replies:\n`;
            for (const reply of data.replies) {
              formatted += `  - "${reply}"\n`;
            }
          }
          if (data.affectedSentences.length > 0) {
            formatted += `Affected Sentence(s):\n`;
            for (const sentence of data.affectedSentences) {
              formatted += `  - "${sentence}"\n`;
            }
          }
          break;
        }

        case 'highlight': {
          const data = annotation.data as HighlightForLLM;
          formatted += `Annotation Type: Highlight\n`;
          formatted += `Highlighted Text: "${data.selectedText}"\n`;
          if (data.affectedSentences.length > 0) {
            formatted += `Affected Sentence(s):\n`;
            for (const sentence of data.affectedSentences) {
              formatted += `  - "${sentence}"\n`;
            }
          }
          break;
        }

        case 'wordLevelTrackchange': {
          const data = annotation.data as TrackChangeForLLM;
          formatted += `Annotation Type: Track Changes\n`;
          formatted += `Original: "${data.originalSentence}"\n`;
          formatted += `Amended: "${data.amendedSentence}"\n`;
          if (data.deleted.length > 0) {
            formatted += `Deleted:\n`;
            for (const d of data.deleted) {
              formatted += `  - "${d.text}"\n`;
            }
          }
          if (data.added.length > 0) {
            formatted += `Added:\n`;
            for (const a of data.added) {
              formatted += `  - "${a.text}"\n`;
            }
          }
          break;
        }

        case 'fullSentenceDeletion': {
          const data = annotation.data as FullSentenceDeletionForLLM;
          formatted += `Annotation Type: Full Sentence Deletion\n`;
          formatted += `Deleted Text: "${data.deletedText}"\n`;
          break;
        }

        case 'fullSentenceInsertion': {
          const data = annotation.data as FullSentenceInsertionForLLM;
          formatted += `Annotation Type: Full Sentence Insertion\n`;
          formatted += `Inserted Text: "${data.insertedText}"\n`;
          break;
        }
      }

      return formatted;
    })
    .join('\n');
}

/**
 * Extract the deepest-level textFragment from an annotation's fragment data.
 * For cross-section annotations (e.g. spanning 8.2 → 8.2.2 → 8.2.2.1),
 * this returns only the text from the deepest section (where isFromParent === false).
 *
 * Returns null if no fragment data is available (older annotations, single-section).
 */
function getDeepestTextFragment(annotation: NormalizedAnnotation): string | null {
  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      const fragments = data.affectedSentenceFragments?.[0];
      if (!fragments || fragments.length === 0) return null;
      const deepest = fragments.find(f => !f.isFromParent);
      return deepest?.textFragment || null;
    }
    case 'highlight': {
      const data = annotation.data as HighlightForLLM;
      const fragments = data.affectedSentenceFragments?.[0];
      if (!fragments || fragments.length === 0) return null;
      const deepest = fragments.find(f => !f.isFromParent);
      return deepest?.textFragment || null;
    }
    case 'wordLevelTrackchange': {
      const data = annotation.data as TrackChangeForLLM;
      const fragments = data.sentenceFragments;
      if (!fragments || fragments.length === 0) return null;
      const deepest = fragments.find(f => !f.isFromParent);
      return deepest?.textFragment || null;
    }
    default:
      return null;
  }
}

/**
 * Get location text from an annotation
 * Used for the Locate button - returns the full text of the deepest-level section
 * for reliable matching in the Word document.
 *
 * Uses section text (not affected sentences) because:
 * - Sentences can span multiple paragraphs with gaps
 * - Section text is contiguous and reliable for searching
 * - Section numbers are auto-generated by Word and not searchable as text
 *
 * @param annotation - The normalized annotation with section information
 * @param documentStructure - The parsed document structure to look up sections
 */
function getLocationTextFromAnnotation(
  annotation: NormalizedAnnotation,
  documentStructure: SectionNode[]
): string {
  // For full-sentence insertions/deletions, always use the specific text directly.
  // These don't have fragment data or reliable section mappings.
  if (annotation.type === 'fullSentenceDeletion') {
    const data = annotation.data as FullSentenceDeletionForLLM;
    return data.deletedText;
  }
  if (annotation.type === 'fullSentenceInsertion') {
    const data = annotation.data as FullSentenceInsertionForLLM;
    return data.insertedText;
  }

  // Prefer the deepest-level textFragment for cross-section annotations
  const deepestFragment = getDeepestTextFragment(annotation);
  if (deepestFragment) return deepestFragment;

  // Look up the section by its deepest-level section number
  const sectionNumber = annotation.sectionNumber;

  if (sectionNumber && documentStructure.length > 0) {
    const section = findSection(documentStructure, sectionNumber);
    if (section) {
      // Return section's own text content (without section number prefix - that's Word auto-numbering)
      // Include additional paragraphs if present
      let sectionText = section.text;
      if (section.additionalParagraphs && section.additionalParagraphs.length > 0) {
        sectionText += ' ' + section.additionalParagraphs.join(' ');
      }
      return sectionText;
    }
  }

  // Fallback: use annotation-specific text if section not found
  // (fullSentenceDeletion and fullSentenceInsertion are handled by the early returns above)
  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      return data.affectedSentences?.[0] || data.selectedText;
    }
    case 'highlight': {
      const data = annotation.data as HighlightForLLM;
      return data.affectedSentences?.[0] || data.selectedText;
    }
    case 'wordLevelTrackchange': {
      const data = annotation.data as TrackChangeForLLM;
      return data.originalSentence;
    }
    default:
      return '';
  }
}

/**
 * Get selected text from an annotation for highlighting within location_text.
 * For comments/highlights: the exact text the user selected
 * For track changes: null (entire sentence is highlighted)
 */
function getSelectedTextFromAnnotation(annotation: NormalizedAnnotation): string | null {
  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      return data.selectedText || null;
    }
    case 'highlight': {
      const data = annotation.data as HighlightForLLM;
      return data.selectedText || null;
    }
    case 'wordLevelTrackchange':
    case 'fullSentenceDeletion':
    case 'fullSentenceInsertion':
      // For track changes, we highlight the whole sentence (Word shows markup)
      return null;
    default:
      return null;
  }
}

/**
 * Get example language from an annotation
 * Uses the full sentence(s) containing the annotation - not LLM-generated
 */
function getExampleLanguageFromAnnotation(annotation: NormalizedAnnotation): string {
  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      // Use affected sentences (full sentences containing the comment)
      if (data.affectedSentences && data.affectedSentences.length > 0) {
        return data.affectedSentences.join(' ');
      }
      return data.selectedText || '';
    }
    case 'highlight': {
      const data = annotation.data as HighlightForLLM;
      // Use affected sentences (full sentences containing the highlight)
      if (data.affectedSentences && data.affectedSentences.length > 0) {
        return data.affectedSentences.join(' ');
      }
      return data.selectedText || '';
    }
    case 'wordLevelTrackchange': {
      const data = annotation.data as TrackChangeForLLM;
      // Use the amended sentence (result after changes)
      return data.amendedSentence || '';
    }
    case 'fullSentenceDeletion': {
      const data = annotation.data as FullSentenceDeletionForLLM;
      return data.deletedText || '';
    }
    case 'fullSentenceInsertion': {
      const data = annotation.data as FullSentenceInsertionForLLM;
      return data.insertedText || '';
    }
    default:
      return '';
  }
}

/**
 * Capitalize the first letter of a string.
 * Used to normalize brief names so they always start with an uppercase letter,
 * regardless of what the LLM or fallback logic produces.
 */
function capitalizeBriefName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generate a default brief name from instruction if LLM didn't provide one
 */
function generateDefaultBriefName(instruction: string): string {
  const words = instruction.split(/\s+/).slice(0, 8);
  let briefName = words.join(' ');

  if (briefName.length > 50) {
    briefName = briefName.substring(0, 47) + '...';
  }

  briefName = briefName.replace(/\.$/, '');

  return capitalizeBriefName(briefName);
}

/**
 * Format a single annotation for the prompt (used in re-run)
 */
function formatSingleAnnotationForPrompt(annotation: NormalizedAnnotation, annotationNumber: number): string {
  let formatted = `\n--- Annotation ${annotationNumber} ---\n`;

  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      formatted += `Annotation Type: Comment\n`;
      formatted += `Selected Text: "${data.selectedText}"\n`;
      formatted += `Comment: "${data.commentContent}"\n`;
      if (data.replies.length > 0) {
        formatted += `Replies:\n`;
        for (const reply of data.replies) {
          formatted += `  - "${reply}"\n`;
        }
      }
      if (data.affectedSentences.length > 0) {
        formatted += `Affected Sentence(s):\n`;
        for (const sentence of data.affectedSentences) {
          formatted += `  - "${sentence}"\n`;
        }
      }
      break;
    }

    case 'highlight': {
      const data = annotation.data as HighlightForLLM;
      formatted += `Annotation Type: Highlight\n`;
      formatted += `Highlighted Text: "${data.selectedText}"\n`;
      if (data.affectedSentences.length > 0) {
        formatted += `Affected Sentence(s):\n`;
        for (const sentence of data.affectedSentences) {
          formatted += `  - "${sentence}"\n`;
        }
      }
      break;
    }

    case 'wordLevelTrackchange': {
      const data = annotation.data as TrackChangeForLLM;
      formatted += `Annotation Type: Track Changes\n`;
      formatted += `Original: "${data.originalSentence}"\n`;
      formatted += `Amended: "${data.amendedSentence}"\n`;
      if (data.deleted.length > 0) {
        formatted += `Deleted:\n`;
        for (const d of data.deleted) {
          formatted += `  - "${d.text}"\n`;
        }
      }
      if (data.added.length > 0) {
        formatted += `Added:\n`;
        for (const a of data.added) {
          formatted += `  - "${a.text}"\n`;
        }
      }
      break;
    }

    case 'fullSentenceDeletion': {
          const data = annotation.data as FullSentenceDeletionForLLM;
          formatted += `Annotation Type: Full Sentence Deletion\n`;
          formatted += `Deleted Text: "${data.deletedText}"\n`;
          break;
        }

    case 'fullSentenceInsertion': {
      const data = annotation.data as FullSentenceInsertionForLLM;
      formatted += `Annotation Type: Full Sentence Insertion\n`;
      formatted += `Inserted Text: "${data.insertedText}"\n`;
      break;
    }
  }

  return formatted;
}

/**
 * Generate rules from batches
 */
export async function generateRulesFromBatches(
  batches: Batch[],
  jobId: string,
  ruleType: 'CA' | 'IR',
  documentStructure: SectionNode[]
): Promise<{ ruleCategories: RuleCategory[]; generationContexts: RuleRerunContextMap }> {
  const allRuleCategories: RuleCategory[] = [];
  const generationContexts: RuleRerunContextMap = {};

  // TEST MODE: Skip rule generation
  if (TEST_MODE?.skipRuleGeneration || TEST_MODE?.skipAllLLM) {
    logger.info({ jobId, batchCount: batches.length, ruleType }, 'TEST MODE: Skipping rule generation');
    console.log(`\n========== TEST MODE: ${ruleType} BATCHES THAT WOULD BE PROCESSED ==========`);
    for (const [i, batch] of batches.entries()) {
      console.log(`\nBatch ${i + 1}/${batches.length}: ${batch.batchId}`);
      console.log(`  Section: ${batch.topLevelSectionNumber}, Annotations: ${batch.annotations.length}`);
    }
    console.log('\n========== END BATCHES ==========\n');
    
    const emptyCategory = ruleType === 'CA' 
      ? { type: 'Rules for Contract Amendments' as const, rules: [] }
      : { type: 'Rules for Instruction Requests' as const, rules: [] };
    
    return {
      ruleCategories: [emptyCategory],
      generationContexts: {},
    };
  }

  for (const [i, batch] of batches.entries()) {

    const formattedAnnotations = formatAnnotationsForPrompt(batch.annotations);
    
    // Select prompt based on rule type
    let prompt: string;
    if (ruleType === 'CA') {
      const annotationTypes = [...new Set(
        batch.annotations.map(a => a.sourceAnnotationType)
      )] as ('comment' | 'trackChange' | 'highlight')[];
      prompt = generateCARulesPrompt(batch.context, formattedAnnotations, annotationTypes);
    } else {
      prompt = generateIRRulesPrompt(batch.context, formattedAnnotations);
    }

    // Log full prompt 
    logger.info(
      {
        jobId,
        batchId: batch.batchId,
        ruleType,
        prompt: prompt,
      },
      'Playbook Generation: Full prompt to LLM - Generate rules'
    );

    if (process.env.DRY_RUN === 'true') {
      logger.info({ jobId, batchId: batch.batchId }, 'DRY_RUN: Skipping LLM call');
      continue;
    }

    try {
      const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini'});

      logger.info(
        {
          jobId,
          batchId: batch.batchId,
          ruleType,
          rawResponse: result,
        },
        'Playbook Generation: Full LLM response - Generate rules'
      );

      // Handle flat array response (new prompts return flat arrays, not categorized)
      const rules = Array.isArray(result) ? result : [];
      
      for (const rule of rules) {
        // Get source annotation (1-indexed from LLM, convert to 0-indexed)
        const sourceAnnotationIndex = (rule.source_annotation ?? 1) - 1;
        const sourceAnnotation = batch.annotations[sourceAnnotationIndex] ?? batch.annotations[0];
        
        if (!sourceAnnotation) {
          logger.warn({ jobId, batchId: batch.batchId, ruleNumber: rule.rule_number }, 
            'Playbook Generation: No source annotation found for rule');
          continue;
        }

        const sourceAnnotationKey = `${ruleType}-${batch.batchId}:ann-${sourceAnnotationIndex}`;
        const ruleId = uuidv4();

        // Build location data
        const locationText = sourceAnnotation
          ? getLocationTextFromAnnotation(sourceAnnotation, documentStructure)
          : '';
        const selectedText = sourceAnnotation
          ? getSelectedTextFromAnnotation(sourceAnnotation)
          : null;

        const processedRule: GeneratedRule = {
          id: ruleId,
          rule_number: rule.rule_number,
          brief_name: capitalizeBriefName(rule.brief_name || generateDefaultBriefName(rule.instruction)),
          instruction: rule.instruction,
          example_language: sourceAnnotation
            ? getExampleLanguageFromAnnotation(sourceAnnotation)
            : '',
          location_text: locationText,
          // Only include selected_text if it has a value (exactOptionalPropertyTypes)
          ...(selectedText ? { selected_text: selectedText } : {}),
          sourceAnnotationType: sourceAnnotation?.sourceAnnotationType || 'unknown',
          topLevelSectionNumber: batch.topLevelSectionNumber,
          sectionNumber: sourceAnnotation?.sectionNumber || '',
          sourceAnnotationKey,
          source_annotation: sourceAnnotation.originalIndex,
          condition: undefined,
        };

        // Store generation context (including location data for re-run)
        if (!generationContexts[sourceAnnotationKey]) {
          generationContexts[sourceAnnotationKey] = {
            sourceAnnotationKey,
            batchId: batch.batchId,
            topLevelSectionNumber: batch.topLevelSectionNumber,
            context: batch.context,
            sentences: batch.sentences,
            formattedAnnotation: formatSingleAnnotationForPrompt(sourceAnnotation, sourceAnnotationIndex + 1),
            annotation: sourceAnnotation,
            ruleType,
            // Store location data for re-run (we won't have document structure then)
            location_text: locationText,
            ...(selectedText ? { selected_text: selectedText } : {}),
          };
        }

        // Add to appropriate category
        const categoryType = ruleType === 'CA' 
          ? 'Rules for Contract Amendments' 
          : 'Rules for Instruction Requests';
        
        let category = allRuleCategories.find(c => c.type === categoryType);
        if (!category) {
          category = { type: categoryType, rules: [] };
          allRuleCategories.push(category);
        }
        // Debug: log each rule and its source annotation linkage
        logger.info(
          {
            jobId,
            sourceAnnotationKey,
            ruleId,
            ruleNumber: processedRule.rule_number,
            briefName: processedRule.brief_name,
            ruleType,
            batchId: batch.batchId,
            sourceAnnotationIndex,
            sourceAnnotationType: sourceAnnotation.sourceAnnotationType,
            originalIndex: sourceAnnotation.originalIndex,
            annotationType: sourceAnnotation.type,
            annotationData: sourceAnnotation.data,
            location_text: locationText,
            selected_text: selectedText,
          },
          `Rule → Annotation link: ${processedRule.rule_number} ← ${sourceAnnotationKey}`
        );

        category.rules.push(processedRule);
      }

    } catch (error) {
      logger.error(
        {
          jobId,
          batchId: batch.batchId,
          section: batch.topLevelSectionNumber,
          error: error instanceof Error ? error.message : error,
        },
        'Playbook Generation: Failed to process batch'
      );
    }
  }

  // Return categories directly - merging happens in controller
  return { 
    ruleCategories: allRuleCategories, 
    generationContexts 
  };
}

/**
 * Merge and renumber rule categories from multiple batches
 */
export function mergeRuleCategories(
  caCategories: RuleCategory[],
  irCategories: RuleCategory[]
): RuleCategory[] {
  const instructionRequests: GeneratedRule[] = [];
  const contractAmendments: GeneratedRule[] = [];

  for (const category of irCategories) {
    if (category.type === 'Rules for Instruction Requests') {
      instructionRequests.push(...(category.rules || []));
    }
  }

  for (const category of caCategories) {
    if (category.type === 'Rules for Contract Amendments') {
      contractAmendments.push(...(category.rules || []));
    }
  }

  // Sort rules by deepest section number (document order) before renumbering
  instructionRequests.sort((a, b) =>
    compareSectionNumbers(a.sectionNumber || '', b.sectionNumber || '')
  );
  contractAmendments.sort((a, b) =>
    compareSectionNumbers(a.sectionNumber || '', b.sectionNumber || '')
  );

  // Renumber rules after sorting
  instructionRequests.forEach((rule, index) => {
    rule.rule_number = `IR${index + 1}`;
  });

  contractAmendments.forEach((rule, index) => {
    rule.rule_number = `CA${index + 1}`;
  });

  return [
    { type: 'Rules for Instruction Requests', rules: instructionRequests },
    { type: 'Rules for Contract Amendments', rules: contractAmendments },
  ];
}

/**
 * Expand rules by section - sends rules grouped by top-level section to LLM for expansion
 */
export async function expandRulesBySection(
  ruleCategories: RuleCategory[],
  structure: SectionNode[],
  jobId: string
): Promise<RuleCategory[]> {
  if (TEST_MODE?.skipRuleGeneration || TEST_MODE?.skipAllLLM) {
    logger.info('TEST MODE: Skipping rule expansion');
    return ruleCategories;
  }
  // Collect all rules with their category type
  const allRulesWithMeta: Array<{
    rule: GeneratedRule;
    categoryType: RuleCategoryType;
  }> = [];

  for (const category of ruleCategories) {
    for (const rule of category.rules || []) {
      allRulesWithMeta.push({ rule, categoryType: category.type });
    }
  }

  if (allRulesWithMeta.length === 0) {
    return ruleCategories;
  }

  // Group rules by topLevelSectionNumber
  const rulesBySection = new Map<string, Array<{ rule: GeneratedRule; categoryType: RuleCategoryType }>>();

  for (const item of allRulesWithMeta) {
    const section = item.rule.topLevelSectionNumber || 'unknown';
    if (!rulesBySection.has(section)) {
      rulesBySection.set(section, []);
    }
    rulesBySection.get(section)!.push(item);
  }

  // Process each section
  const expandedRulesMap = new Map<string, string>(); // rule_number -> amended_instruction

  for (const [sectionNumber, rulesInSection] of rulesBySection) {
    // Build context for this section
    const topLevelSection = findTopLevelSection(sectionNumber, structure);
    const context = topLevelSection
      ? buildFullSectionText(topLevelSection)
      : `Section ${sectionNumber}`;

    // Format rules for prompt
    const rulesText = rulesInSection
      .map((item) => `${item.rule.rule_number}: ${item.rule.instruction}`)
      .join('\n');

    try {
      const prompt = expandRulePrompt(context, rulesText);

      logger.info(
        {
          jobId,
          sectionNumber,
          rulesCount: rulesInSection.length,
          prompt,
        },
        'Playbook Generation: Full prompt to LLM - Expand rules'
      );

      const result = await generateTextWithJsonParsing('', prompt, { model: 'gpt-4o'});

      logger.info(
        {
          jobId,
          sectionNumber,
          rawResponse: result,
        },
        'Playbook Generation: Full LLM response - Expand rules'
      );

      if (Array.isArray(result)) {
        for (const expanded of result) {
          if (expanded.original_rule_number && expanded.amended_instruction) {
            expandedRulesMap.set(expanded.original_rule_number, expanded.amended_instruction);
          }
        }
      }
    } catch (error) {
      logger.error(
        {
          sectionNumber,
          error: error instanceof Error ? error.message : error,
        },
        'Playbook Generation: Failed to expand rules for section'
      );
      // Continue with other sections - rules will keep original instruction
    }
  }

  // Apply expansions to original categories
  const expandedCategories: RuleCategory[] = ruleCategories.map((category) => ({
    ...category,
    rules: (category.rules || []).map((rule) => ({
      ...rule,
      instruction: expandedRulesMap.get(rule.rule_number) || rule.instruction,
    })),
  }));

  logger.info(
    {
      jobId,
      totalRules: allRulesWithMeta.length,
      sectionsProcessed: rulesBySection.size,
      rulesExpanded: expandedRulesMap.size,
    },
    'Playbook Generation: Rules expanded'
  );

  return expandedCategories;
}

// ============================================
// STEP 5: RULE CLASSIFICATION
// ============================================

/**
 * Apply conditional status to rules based on source annotation classification
 * Both IR and CA rules can be conditional
 */
export function applyConditionalStatusToRules(
  irRules: GeneratedRule[],
  caRules: GeneratedRule[],
  fullClassification: FullClassificationOutput,
  jobId: string
): {
  instructionRequestRules: GeneratedRule[];
  alwaysAppliedAmendmentRules: GeneratedRule[];
  conditionalAmendmentRules: GeneratedRule[];
} {
  const getConditionalStatus = (rule: GeneratedRule): { isConditional: boolean; condition: string | undefined } => {
    const sourceIndex = rule.source_annotation;  
    if (!sourceIndex) return { isConditional: false, condition: undefined };

    const classificationResult = fullClassification.results.find((r) => r.index === sourceIndex);  
    if (!classificationResult) return { isConditional: false, condition: undefined };

    return {
      isConditional: classificationResult.isConditional,
      condition: classificationResult.condition,
    };
  };

  // Process IR rules - split into conditional and unconditional
  const conditionalIRRules: GeneratedRule[] = [];
  const unconditionalIRRules: GeneratedRule[] = [];

  for (const rule of irRules) {
    const status = getConditionalStatus(rule);
    if (status.isConditional) {
      conditionalIRRules.push({ ...rule, condition: status.condition });
    } else {
      unconditionalIRRules.push(rule);
    }
  }

  // Process CA rules - split into conditional and unconditional
  const conditionalCARules: GeneratedRule[] = [];
  const unconditionalCARules: GeneratedRule[] = [];

  for (const rule of caRules) {
    const status = getConditionalStatus(rule);
    if (status.isConditional) {
      conditionalCARules.push({ ...rule, condition: status.condition });
    } else {
      unconditionalCARules.push(rule);
    }
  }

  // Log each rule with its conditional status
  const allProcessedRules = [
    ...unconditionalIRRules.map(r => ({ ...r, isConditional: false })),
    ...conditionalIRRules.map(r => ({ ...r, isConditional: true })),
    ...unconditionalCARules.map(r => ({ ...r, isConditional: false })),
    ...conditionalCARules.map(r => ({ ...r, isConditional: true })),
  ];

  logger.info(
    {
      jobId,
      rules: allProcessedRules.map(r => ({
        rule_number: r.rule_number,
        brief_name: r.brief_name,
        instruction: r.instruction,
        source_annotation: r.source_annotation,
        isConditional: r.isConditional,
        condition: r.condition || null,
      })),
    },
    'Playbook Generation: Rules with conditional status'
  );

  return {
    instructionRequestRules: [...unconditionalIRRules, ...conditionalIRRules],
    alwaysAppliedAmendmentRules: unconditionalCARules,
    conditionalAmendmentRules: conditionalCARules,
  };
}

// ============================================
// RE-RUN
// ============================================

/**
 * Re-run rule generation for a specific annotation with a different interpretation
 */
export async function rerunRules(
  request: RuleRerunRequest,
  jobId: string
): Promise<RuleRerunResult> {
  const { generationContext, previousRules } = request;

  logger.info(
    {
      jobId,
      sourceAnnotationKey: generationContext.sourceAnnotationKey,
      previousRuleCount: previousRules.length,
    },
    'Playbook Generation: Re-running rules'
  );

  // Group rules by attempt number
  const rulesByAttempt = new Map<number, typeof previousRules>();
  for (const rule of previousRules) {
    const attempt = (rule as any).attempt ?? 0;
    if (!rulesByAttempt.has(attempt)) {
      rulesByAttempt.set(attempt, []);
    }
    rulesByAttempt.get(attempt)!.push(rule);
  }

  // Format previous rules grouped by attempt
  const sortedAttempts = [...rulesByAttempt.keys()].sort((a, b) => a - b);
  const previousRulesText = sortedAttempts
    .map((attempt) => {
      const rules = rulesByAttempt.get(attempt)!;
      const attemptLabel = attempt === 0 ? 'Original interpretation' : `Retry attempt ${attempt}`;
      const rulesText = rules
        .map((rule) => `- ${rule.brief_name}: ${rule.instruction}`)
        .join('\n');
      return `**${attemptLabel}:**\n${rulesText}`;
    })
    .join('\n\n');

  const ruleType = generationContext.ruleType || 'CA'; // Default to CA for backward compatibility
  
  const prompt = rerunRulesPrompt(
    generationContext.context,
    generationContext.formattedAnnotation,
    previousRulesText,
    ruleType
  );

  logger.info(
    {
      jobId,
      sourceAnnotationKey: generationContext.sourceAnnotationKey,
      ruleType,
      prompt: prompt,
    },
    'Playbook Generation (re-run): Full prompt to LLM (rule generation)'
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini'});

    logger.info(
      {
        jobId,
        sourceAnnotationKey: generationContext.sourceAnnotationKey,
        ruleType,
        rawResponse: result,
      },
      'Playbook Generation (re-run): Full LLM response (rule generation)'
    );

    if (!Array.isArray(result)) {
      throw new Error('LLM did not return expected array format');
    }

    // Process the new rules
    const newRules: GeneratedRule[] = [];
    const newRuleIds: string[] = [];

    for (const category of result) {
      for (const rule of category.rules || []) {
        const ruleId = uuidv4();
        newRuleIds.push(ruleId);

        newRules.push({
          id: ruleId,
          rule_number: rule.rule_number,
          brief_name: capitalizeBriefName(rule.brief_name || generateDefaultBriefName(rule.instruction)),
          instruction: rule.instruction,
          example_language: generationContext.annotation
            ? getExampleLanguageFromAnnotation(generationContext.annotation)
            : '',
          // Use stored location data from initial generation (we don't have document structure for re-run)
          location_text: generationContext.location_text || '',
          // Only include selected_text if it has a value (exactOptionalPropertyTypes)
          ...(generationContext.selected_text ? { selected_text: generationContext.selected_text } : {}),
          sourceAnnotationType: generationContext.annotation?.sourceAnnotationType || 'unknown',
          topLevelSectionNumber: generationContext.topLevelSectionNumber,
          sectionNumber: generationContext.annotation?.sectionNumber || '',
          sourceAnnotationKey: generationContext.sourceAnnotationKey,
          condition: undefined,
        });
      }
    }

    // ========================================
    // EXPAND RULES (same as initial generation)
    // ========================================
    
    // Format rules for expansion prompt
    const rulesText = newRules
      .map((r) => `${r.rule_number}: ${r.instruction}`)
      .join('\n');

    try {
      const expandPrompt = expandRulePrompt(generationContext.context, rulesText);

      logger.info(
        {
          jobId,
          sourceAnnotationKey: generationContext.sourceAnnotationKey,
          prompt: expandPrompt,
        },
        'Playbook Generation (re-run): Full prompt to LLM (rule expansion)'
      );

      const expandedResult = await generateTextWithJsonParsing('', expandPrompt, { model: 'gpt-4o'});

      logger.info(
        {
          jobId,
          sourceAnnotationKey: generationContext.sourceAnnotationKey,
          response: expandedResult,
        },
        'Playbook Generation (re-run): Full LLM response (rule expansion)'
      );

      if (Array.isArray(expandedResult)) {
        // Create a map of expanded instructions
        const expandedMap = new Map<string, string>();
        for (const expanded of expandedResult) {
          if (expanded.original_rule_number && expanded.amended_instruction) {
            expandedMap.set(expanded.original_rule_number, expanded.amended_instruction);
          }
        }

        // Apply expanded instructions to rules
        for (const rule of newRules) {
          const expandedInstruction = expandedMap.get(rule.rule_number);
          if (expandedInstruction) {
            rule.instruction = expandedInstruction;
          }
        }
      }
    } catch (expandError) {
      // If expansion fails, continue with unexpanded rules
      logger.warn(
        {
          jobId,
          error: expandError instanceof Error ? expandError.message : expandError,
        },
        'Playbook Generation: Re-run expansion failed, using unexpanded rules'
      );
    }

    logger.info(
      {
        jobId,
        sourceAnnotationKey: generationContext.sourceAnnotationKey,
        previousRuleCount: previousRules.length,
        newRuleCount: newRules.length,
      },
      'Playbook Generation: Re-run complete'
    );

    return {
      success: true,
      newRules,
      updatedContext: {
        ...generationContext,
      },
    };
  } catch (error) {
    logger.error(
      {
        jobId,
        sourceAnnotationKey: generationContext.sourceAnnotationKey,
        error: error instanceof Error ? error.message : error,
      },
      'Playbook Generation: Re-run failed'
    );
    throw error;
  }
}

// ============================================
// CONDITION REMOVAL
// ============================================

export async function removeConditionsFromRules(
  rules: GeneratedRule[]
): Promise<GeneratedRule[]> {
  if (TEST_MODE?.skipRuleGeneration || TEST_MODE?.skipAllLLM) {
    logger.info('TEST MODE: Skipping condition removal');
    return rules;
  }
  if (rules.length === 0) {
    return [];
  }

  const rulesText = JSON.stringify(rules, null, 2);

  const cleanedRules = await generateTextWithJsonParsing(
    removeConditionPrompt,
    rulesText,
    { model: 'gpt-4o'}
  );

  return cleanedRules;
}