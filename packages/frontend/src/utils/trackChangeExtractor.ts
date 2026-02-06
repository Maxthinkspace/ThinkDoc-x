import type {
  DocumentNodeWithRange,
  WordLevelTrackChangeResults,
  FullSentenceInsertion,
  FullSentenceDeletion,
  TrackChangeExtractionResults,
  ChangeWithSection,
  StructuralChange,
  SectionMatchResult,
  TextToken,
  SentenceSourceComponent,
} from '@/src/types/documents';
import type { ParsedDocumentWithRanges } from '@/src/types/documents';
import {
  findSectionByOoxmlIndex,
  findNearestSectionByOoxmlIndex,
  extractTokensFromParagraph,
  extractTokensFromParagraphWithOffsets,
} from '@/src/utils/documentParserHelpers';
import {
  extractAllSentencesWithSources,
  extractSentenceChangesFromTokens,
  SentenceChangeResult,
  SentenceFragment,
  normalizeFragmentText,
  buildFullSentenceWithReplacement,
} from '@/src/utils/annotationExtractionHelpers';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize section number for comparison
 */
function normalizeSectionNumber(sectionNum: string): string {
  return sectionNum.trim().replace(/\.+$/, '');
}

/**
 * Consolidate adjacent full-sentence deletions in the same section
 */
function consolidateFullSentenceDeletions(deletions: FullSentenceDeletion[]): FullSentenceDeletion[] {
  if (deletions.length <= 1) return deletions;
  
  const result: FullSentenceDeletion[] = [];
  let current = deletions[0];
  let currentText = current.deletedText;
  
  for (let i = 1; i < deletions.length; i++) {
    const next = deletions[i];
    
    // Consolidate if same section
    if (current.sectionNumber === next.sectionNumber) {
      currentText += ' ' + next.deletedText;
    } else {
      result.push({ ...current, deletedText: currentText });
      current = next;
      currentText = next.deletedText;
    }
  }
  
  result.push({ ...current, deletedText: currentText });
  
  return result.map((d, i) => ({ ...d, id: `fsd-${i}` }));
}

/**
 * Consolidate adjacent full-sentence insertions in the same section
 */
function consolidateFullSentenceInsertions(insertions: FullSentenceInsertion[]): FullSentenceInsertion[] {
  if (insertions.length <= 1) return insertions;
  
  const result: FullSentenceInsertion[] = [];
  let current = insertions[0];
  let currentText = current.insertedText;
  
  for (let i = 1; i < insertions.length; i++) {
    const next = insertions[i];
    
    // Consolidate if same section
    if (current.inferredTopLevelSection === next.inferredTopLevelSection) {
      currentText += ' ' + next.insertedText;
    } else {
      result.push({ ...current, insertedText: currentText });
      current = next;
      currentText = next.insertedText;
    }
  }
  
  result.push({ ...current, insertedText: currentText });
  
  return result.map((ins, i) => ({ ...ins, id: `fsi-${i}` }));
}

// ============================================================================
// SENTENCE-TO-SECTION MAPPING HELPERS
// ============================================================================

/**
 * Build a map from section number to sentence info for quick lookup.
 * A section may contribute to multiple sentences, and a sentence may span multiple sections.
 */
interface SentenceMapping {
  sentenceId: string;
  sentence: string;
  topLevelSectionNumber: string;
  sourceComponents: SentenceSourceComponent[];
}

interface SectionToSentencesMap {
  /** Map from normalized section number to sentences that include content from that section */
  bySectionNumber: Map<string, SentenceMapping[]>;
  /** All sentences for iteration */
  allSentences: SentenceMapping[];
}

/**
 * Build mapping from sections to sentences using pre-extracted sentence data.
 */
function buildSectionToSentenceMap(
  combinedStructure: DocumentNodeWithRange[]
): SectionToSentencesMap {
  const allSentencesWithSources = extractAllSentencesWithSources(
    combinedStructure,
    'trackChangeExtractor'
  );

  const bySectionNumber = new Map<string, SentenceMapping[]>();
  const allSentences: SentenceMapping[] = [];

  for (const sentenceData of allSentencesWithSources) {
    const mapping: SentenceMapping = {
      sentenceId: sentenceData.id,
      sentence: sentenceData.sentence,
      topLevelSectionNumber: sentenceData.topLevelSectionNumber,
      sourceComponents: sentenceData.sourceComponents,
    };

    allSentences.push(mapping);

    // Index by each contributing section
    for (const component of sentenceData.sourceComponents) {
      const normalizedSection = normalizeSectionNumber(component.sectionNumber);
      const existing = bySectionNumber.get(normalizedSection) || [];
      
      // Avoid duplicates
      if (!existing.some(m => m.sentenceId === mapping.sentenceId)) {
        existing.push(mapping);
        bySectionNumber.set(normalizedSection, existing);
      }
    }
  }

  return { bySectionNumber, allSentences };
}

/**
 * Find the sentence that contains a given text fragment from a specific section.
 * Uses both section matching and text overlap for accuracy.
 */
function findSentenceForChange(
  sectionNumber: string,
  changeText: string,
  sectionMap: SectionToSentencesMap
): SentenceMapping | null {
  const normalizedSection = normalizeSectionNumber(sectionNumber);
  const candidates = sectionMap.bySectionNumber.get(normalizedSection);

  if (!candidates || candidates.length === 0) {
    return null;
  }

  // If only one sentence contains this section, return it
  if (candidates.length === 1) {
    return candidates[0];
  }

  // Multiple sentences - find best match by text overlap
  const normalizedChange = changeText.toLowerCase().trim();
  
  for (const candidate of candidates) {
    const normalizedSentence = candidate.sentence.toLowerCase();
    if (normalizedSentence.includes(normalizedChange)) {
      return candidate;
    }
  }

  // Fallback to first candidate if no text match
  return candidates[0];
}

/**
 * Build sentenceFragments array from sourceComponents for the SourceAnnotation.
 */
function buildSentenceFragments(
  sourceComponents: SentenceSourceComponent[]
): SentenceSourceComponent[] {
  return sourceComponents.map(comp => ({
    sectionNumber: comp.sectionNumber,
    level: comp.level,
    textFragment: comp.textFragment,
    isFromParent: comp.isFromParent,
    cumulativeStartOffset: comp.cumulativeStartOffset,
    sectionStartOffset: comp.sectionStartOffset,
    sectionEndOffset: comp.sectionEndOffset,
  }));
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function extractTrackChanges(
  context: Word.RequestContext,
  parsedDoc: ParsedDocumentWithRanges
): Promise<TrackChangeExtractionResults> {
  console.log('[trackChangeExtractor] ========== STARTING TRACK CHANGE EXTRACTION ==========');

  // Step 0: Detect structural changes from combined structure using paragraphStatus
  console.log('[trackChangeExtractor] Step 0: Detecting structural changes...');
  const { 
    structuralChanges, 
    unmatchedOriginalSections,
    unmatchedAmendedSections 
  } = detectStructuralChangesFromCombined(parsedDoc.combinedStructure);

  console.log(`[DEBUG 2.1] === STRUCTURAL CHANGES ===`);
  for (const change of structuralChanges) {
    const typeLabel = change.type === 'section-deleted' ? 'DELETED SECTION' : 'ADDED SECTION';
    console.log(`[DEBUG 2.1] [${typeLabel}]`);
    console.log(`[DEBUG 2.1]   Section: ${change.sectionNumber}`);
    console.log(`[DEBUG 2.1]   Title: "${change.sectionTitle}"`);
    console.log(`[DEBUG 2.1]   Full text:`);
    console.log(`[DEBUG 2.1]   "${change.fullContent}"`);
    if (change.subsections.length > 0) {
      console.log(`[DEBUG 2.1]   Subsections: ${change.subsections.join(', ')}`);
    }
    console.log(`[DEBUG 2.1]`);
  }
  
  // Step 1: Get OOXML
  console.log('[trackChangeExtractor] Step 1: Getting OOXML...');
  
  const body = context.document.body;
  const ooxml = body.getOoxml();
  await context.sync();
  
  const xmlParser = new DOMParser();
  const xmlDoc = xmlParser.parseFromString(ooxml.value, "text/xml");
  
  // Quick check for track changes
  const hasInsertions = xmlDoc.getElementsByTagNameNS("*", "ins").length > 0;
  const hasDeletions = xmlDoc.getElementsByTagNameNS("*", "del").length > 0;
  
  console.log(`[trackChangeExtractor] Has insertions: ${hasInsertions}, Has deletions: ${hasDeletions}`);
  
  if (!hasInsertions && !hasDeletions && structuralChanges.length === 0) {
    console.log('[trackChangeExtractor] No changes found - returning empty result');
    return createEmptyResult();
  }

  // Step 2: Extract word-level changes using token-based approach
  console.log('[trackChangeExtractor] Step 2: Extracting word-level changes from tokens...');
  const {
    wordLevelResults,
    fullSentenceInsertions,
    fullSentenceDeletions
  } = extractWordLevelChangesFromTokens(
    xmlDoc,
    parsedDoc.combinedStructure,
    unmatchedOriginalSections,
    unmatchedAmendedSections
  );
  
  // Step 3: Filter full sentence changes in structural sections
  
  const deletedTopLevelSections = new Set(
    structuralChanges
      .filter(c => c.type === 'section-deleted')
      .map(c => normalizeSectionNumber(c.sectionNumber))
  );

  const insertedTopLevelSections = new Set(
    structuralChanges
      .filter(c => c.type === 'section-inserted')
      .map(c => normalizeSectionNumber(c.sectionNumber))
  );

  const filteredFullSentenceDeletions = fullSentenceDeletions.filter(d => {
    const topLevel = normalizeSectionNumber(d.topLevelSectionNumber);
    if (deletedTopLevelSections.has(topLevel)) {
      console.log(`[trackChangeExtractor] Filtering out deletion in deleted section ${topLevel}`);
      return false;
    }
    return true;
  });

  const filteredFullSentenceInsertions = fullSentenceInsertions.filter(i => {
    const topLevel = normalizeSectionNumber(i.inferredTopLevelSection);
    if (insertedTopLevelSections.has(topLevel)) {
      console.log(`[trackChangeExtractor] Filtering out insertion in inserted section ${topLevel}`);
      return false;
    }
    return true;
  });

  // Filter word-level results in structural sections
  const filteredWordLevelResults = wordLevelResults.filter(r => {
    const topLevel = normalizeSectionNumber(r.topLevelSectionNumber);
    if (deletedTopLevelSections.has(topLevel) || insertedTopLevelSections.has(topLevel)) {
      console.log(`[trackChangeExtractor] Filtering out word-level change in structural section ${topLevel}`);
      return false;
    }
    return true;
  });

  // Build summary
  const summary = {
    totalSentencesWithChanges: filteredWordLevelResults.length,
    totalFullSentenceInsertions: filteredFullSentenceInsertions.length,  
    totalFullSentenceDeletions: filteredFullSentenceDeletions.length,    
    totalDeletions: filteredWordLevelResults.reduce((sum, r) => sum + r.deleted.length, 0),
    totalInsertions: filteredWordLevelResults.reduce((sum, r) => sum + r.added.length, 0),
    totalSectionsDeleted: structuralChanges.filter(c => c.type === 'section-deleted').length,
    totalSectionsInserted: structuralChanges.filter(c => c.type === 'section-inserted').length,
  };
  
  // DEBUG 2.2: Word-level track changes (per sentence)
  console.log(`[DEBUG 2.2] === WORD-LEVEL TRACK CHANGES (${filteredWordLevelResults.length} sentences) ===`);
  for (const wl of filteredWordLevelResults) {
    console.log(`[DEBUG 2.2] sentenceId: ${wl.sentenceId} | section: ${wl.sectionNumber} | topLevel: ${wl.topLevelSectionNumber}`);
    console.log(`[DEBUG 2.2]   originalSentence: "${wl.originalSentence}"`);
    console.log(`[DEBUG 2.2]   amendedSentence: "${wl.amendedSentence}"`);
    for (const d of wl.deleted) {
      console.log(`[DEBUG 2.2]   DELETED: "${d.text}" | section=${d.sectionNumber} | startOffset=${d.startOffset} endOffset=${d.endOffset}`);
    }
    for (const a of wl.added) {
      console.log(`[DEBUG 2.2]   ADDED: "${a.text}" | section=${a.sectionNumber} | startOffset=${a.startOffset} endOffset=${a.endOffset}`);
    }
    console.log(`[DEBUG 2.2]   sentenceFragments: ${wl.sentenceFragments?.length ?? 0}`);
  }

  // DEBUG 2.3: Full sentence insertions
  console.log(`[DEBUG 2.3] === FULL SENTENCE INSERTIONS (${filteredFullSentenceInsertions.length}) ===`);
  for (const fsi of filteredFullSentenceInsertions) {
    console.log(`[DEBUG 2.3] id: ${fsi.id} | section: ${fsi.sectionNumber} | topLevel: ${fsi.inferredTopLevelSection}`);
    console.log(`[DEBUG 2.3]   insertedText: "${fsi.insertedText}"`);
    console.log(`[DEBUG 2.3]   startOffset=${fsi.startOffset} endOffset=${fsi.endOffset}`);
  }

  // DEBUG 2.4: Full sentence deletions
  console.log(`[DEBUG 2.4] === FULL SENTENCE DELETIONS (${filteredFullSentenceDeletions.length}) ===`);
  for (const fsd of filteredFullSentenceDeletions) {
    console.log(`[DEBUG 2.4] id: ${fsd.id} | section: ${fsd.sectionNumber} | topLevel: ${fsd.topLevelSectionNumber}`);
    console.log(`[DEBUG 2.4]   deletedText: "${fsd.deletedText}"`);
    console.log(`[DEBUG 2.4]   startOffset=${fsd.startOffset} endOffset=${fsd.endOffset}`);
  }

  // Summary
  console.log(`[trackChangeExtractor] Summary: ${summary.totalSentencesWithChanges} word-level, ${summary.totalFullSentenceInsertions} full insertions, ${summary.totalFullSentenceDeletions} full deletions, ${summary.totalDeletions} deletions, ${summary.totalInsertions} insertions, ${summary.totalSectionsDeleted} sections deleted, ${summary.totalSectionsInserted} sections inserted`);

  return {
    wordLevelTrackChanges: filteredWordLevelResults,
    fullSentenceInsertions: filteredFullSentenceInsertions,
    fullSentenceDeletions: filteredFullSentenceDeletions,
    structuralChanges,
    summary,
  };
}

// ============================================================================
// STEP 5: MAP CHANGES TO SENTENCES
// ============================================================================

/**
 * Extract word-level changes using the combined-text sentence mapping approach.
 * 
 * Algorithm:
 * 1. Pre-extract all sentences with cross-section source tracking
 * 2. For each paragraph, extract tokens with status labels
 * 3. Find which sentence(s) the paragraph contributes to
 * 4. Map changes to sentences with proper sentence-relative offsets
 * 5. Build sentenceFragments for multi-section offset conversion in UI
 */
function extractWordLevelChangesFromTokens(
  xmlDoc: Document,
  combinedStructure: DocumentNodeWithRange[],
  unmatchedOriginalSections: Set<string>,
  unmatchedAmendedSections: Set<string>
): {
  wordLevelResults: WordLevelTrackChangeResults[];
  fullSentenceInsertions: FullSentenceInsertion[];
  fullSentenceDeletions: FullSentenceDeletion[];
} {
  const wordLevelResults: WordLevelTrackChangeResults[] = [];
  const fullSentenceInsertions: FullSentenceInsertion[] = [];
  const fullSentenceDeletions: FullSentenceDeletion[] = [];

  const body = xmlDoc.getElementsByTagNameNS("*", "body")[0];
  if (!body) {
    console.warn('[extractWordLevelChangesFromTokens] No <w:body> found');
    return { wordLevelResults, fullSentenceInsertions, fullSentenceDeletions };
  }

  // Step 1: Build sentence map for cross-section sentence lookup
  const sectionToSentenceMap = buildSectionToSentenceMap(combinedStructure);
  
  console.log(
    `[trackChangeExtractor] Built sentence map: ${sectionToSentenceMap.allSentences.length} sentences`
  );

  const paragraphs = body.getElementsByTagNameNS("*", "p");

  // Build fragment maps for full-sentence detection
  const originalFragments = new Map<string, SentenceFragment>();
  const amendedFragments = new Map<string, SentenceFragment>();

  // Track processed sentence IDs to avoid duplicates
  const processedSentenceIds = new Set<string>();

  // Track offset per section (resets when section changes)
  let currentSectionNumber: string | null = null;
  let sectionOffset = 0;

  for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
    const para = paragraphs[paraIndex];

    // Find section for this paragraph
    let section = findSectionByOoxmlIndex(paraIndex, combinedStructure);
    if (!section) {
      const nearest = findNearestSectionByOoxmlIndex(paraIndex, combinedStructure);
      if (nearest) {
        section = {
          sectionNumber: nearest.sectionNumber,
          topLevelSectionNumber: nearest.topLevelSectionNumber,
          level: 1,
        };
      }
    }

    // Reset offset when section changes, add separator when staying in same section
    const newSectionNumber = section?.sectionNumber || null;
    if (newSectionNumber !== currentSectionNumber) {
      currentSectionNumber = newSectionNumber;
      sectionOffset = 0;
    } else if (currentSectionNumber !== null && sectionOffset > 0) {
      // Same section, continuing from previous paragraph - add separator
      sectionOffset += 1;
    }

    const { tokens, newOffset } = extractTokensFromParagraphWithOffsets(para, sectionOffset);
    sectionOffset = newOffset;

    // Skip empty paragraphs
    if (tokens.length === 0) continue;

    // Skip paragraphs with no changes
    const hasChanges = tokens.some(t => t.status !== 'unchanged');
    if (!hasChanges) continue;

    if (!section) {
      continue;
    }

    // Determine paragraph change type for filtering
    const allDeleted = tokens.every(t => t.status === 'deleted');
    const allInserted = tokens.every(t => t.status === 'inserted');

    const topLevel = normalizeSectionNumber(section.topLevelSectionNumber);

    // Skip if in structurally changed section
    if (allDeleted && unmatchedOriginalSections.has(topLevel)) {
      continue;
    }
    if (allInserted && unmatchedAmendedSections.has(topLevel)) {
      continue;
    }

    // Extract sentence-level changes from tokens
    const sentenceChanges = extractSentenceChangesFromTokens(
      tokens,
      section.sectionNumber,
      section.topLevelSectionNumber,
      originalFragments,
      amendedFragments
    );

    // Process each change and map to cross-section sentences
    for (const change of sentenceChanges) {
      if (change.changeType === 'full-sentence-insertion') {
        fullSentenceInsertions.push({
          id: `fsi-${fullSentenceInsertions.length}`,
          insertedText: change.amendedText,
          sectionNumber: change.sectionNumber,
          inferredTopLevelSection: change.topLevelSectionNumber,
          startOffset: change.insertions[0]?.startOffset ?? 0,
          endOffset:
            change.insertions[change.insertions.length - 1]?.endOffset ??
            change.amendedText.length,
        });
      } else if (change.changeType === 'full-sentence-deletion') {
        fullSentenceDeletions.push({
          id: `fsd-${fullSentenceDeletions.length}`,
          deletedText: change.originalText,
          sectionNumber: change.sectionNumber,
          topLevelSectionNumber: change.topLevelSectionNumber,
          startOffset: change.deletions[0]?.startOffset ?? 0,
          endOffset:
            change.deletions[change.deletions.length - 1]?.endOffset ??
            change.originalText.length,
        });
      } else if (change.changeType === 'word-level') {
        // Find the cross-section sentence this change belongs to
        const sentenceMapping = findSentenceForChange(
          change.sectionNumber,
          change.amendedText || change.originalText,
          sectionToSentenceMap
        );

        // Build sentence fragments from source components (for downstream conversion)
        let sentenceFragments: SentenceSourceComponent[];
        let effectiveSentenceId: string;
        let effectiveOriginalSentence: string;
        let effectiveAmendedSentence: string;

        if (sentenceMapping && sentenceMapping.sourceComponents.length > 0) {
          sentenceFragments = buildSentenceFragments(sentenceMapping.sourceComponents);
          effectiveSentenceId = sentenceMapping.sentenceId;
          // Build full cross-section sentences by combining parent text with changed section text
          effectiveOriginalSentence = buildFullSentenceWithReplacement(
            sentenceMapping.sourceComponents,
            change.sectionNumber,
            change.originalText
          );
          effectiveAmendedSentence = buildFullSentenceWithReplacement(
            sentenceMapping.sourceComponents,
            change.sectionNumber,
            change.amendedText
          );

          // Check if we already processed this sentence (for multi-section sentences)
          if (processedSentenceIds.has(effectiveSentenceId)) {
            const existingResult = wordLevelResults.find(
              r => r.sentenceId === effectiveSentenceId
            );
            if (existingResult) {
              // Add changes with SECTION-RELATIVE offsets (no conversion)
              for (const d of change.deletions) {
                existingResult.deleted.push({
                  text: d.text,
                  sectionNumber: change.sectionNumber,
                  topLevelSectionNumber: change.topLevelSectionNumber,
                  startOffset: d.startOffset,  // Section-relative (unchanged)
                  endOffset: d.endOffset,      // Section-relative (unchanged)
                });
              }
              for (const i of change.insertions) {
                existingResult.added.push({
                  text: i.text,
                  sectionNumber: change.sectionNumber,
                  topLevelSectionNumber: change.topLevelSectionNumber,
                  startOffset: i.startOffset,  // Section-relative (unchanged)
                  endOffset: i.endOffset,      // Section-relative (unchanged)
                });
              }
              continue;
            }
          }
        } else {
          // Fallback: single-section sentence
          sentenceFragments = [
            {
              sectionNumber: change.sectionNumber,
              level: 1,
              textFragment: change.amendedText,
              isFromParent: false,
              cumulativeStartOffset: 0,
              sectionStartOffset: 0,
              sectionEndOffset: change.amendedText.length,
            },
          ];
          effectiveSentenceId = change.sentenceId;
          effectiveOriginalSentence = change.originalText;
          effectiveAmendedSentence = change.amendedText;
        }

        // Downstream consumers will convert as needed:
        // - ThinkAI: recalculateOffsetsForSelection() → selection-relative
        // - Module 4: convertOffsetsToSentenceRelative() → sentence-relative
        const wordLevelResult: WordLevelTrackChangeResults = {
          sentenceId: effectiveSentenceId,
          sectionNumber: change.sectionNumber,
          topLevelSectionNumber: change.topLevelSectionNumber,
          originalSentence: effectiveOriginalSentence,
          amendedSentence: effectiveAmendedSentence,
          deleted: change.deletions.map(d => ({
            text: d.text,
            sectionNumber: change.sectionNumber,
            topLevelSectionNumber: change.topLevelSectionNumber,
            startOffset: d.startOffset,  // Section-relative (unchanged)
            endOffset: d.endOffset,      // Section-relative (unchanged)
          })),
          added: change.insertions.map(i => ({
            text: i.text,
            sectionNumber: change.sectionNumber,
            topLevelSectionNumber: change.topLevelSectionNumber,
            startOffset: i.startOffset,  // Section-relative (unchanged)
            endOffset: i.endOffset,      // Section-relative (unchanged)
          })),
          sentenceFragments,  // Include for downstream sentence-relative conversion
        };

        wordLevelResults.push(wordLevelResult);
        processedSentenceIds.add(effectiveSentenceId);
      }
    }
  }

  // Consolidate adjacent full-sentence changes
  const consolidatedDeletions = consolidateFullSentenceDeletions(fullSentenceDeletions);
  const consolidatedInsertions = consolidateFullSentenceInsertions(fullSentenceInsertions);

  console.log(
    `[trackChangeExtractor] Extracted ${wordLevelResults.length} word-level changes, ` +
      `${consolidatedDeletions.length} full deletions, ${consolidatedInsertions.length} full insertions`
  );

  return {
    wordLevelResults,
    fullSentenceInsertions: consolidatedInsertions,
    fullSentenceDeletions: consolidatedDeletions,
  };
}

// ============================================================================
// STRUCTURAL CHANGE DETECTION (Combined Structure Approach)
// ============================================================================

/**
 * Detect structural changes from combined structure using paragraphStatus.
 * A top-level section is "deleted" if ALL its content has paragraphStatus === 'deleted'.
 * A top-level section is "inserted" if ALL its content has paragraphStatus === 'inserted'.
 */
function detectStructuralChangesFromCombined(
  combinedStructure: DocumentNodeWithRange[]
): {
  structuralChanges: StructuralChange[];
  unmatchedOriginalSections: Set<string>;
  unmatchedAmendedSections: Set<string>;
} {
  const structuralChanges: StructuralChange[] = [];
  const deletedSections = new Set<string>();
  const insertedSections = new Set<string>();
  
  /**
   * Check if a node and ALL its descendants are entirely deleted
   */
  function isEntirelyDeleted(node: DocumentNodeWithRange): boolean {
  // Check node itself
  if (node.paragraphStatus !== 'deleted') return false;
  
  // Check additional paragraphs
  if (node.additionalParagraphStatuses && node.additionalParagraphStatuses.length > 0) {
    if (!node.additionalParagraphStatuses.every(status => status === 'deleted')) {
      return false;
    }
  }
  
  // Check children recursively
  if (node.children && node.children.length > 0) {
    return node.children.every(child => isEntirelyDeleted(child));
  }
  
  return true;
}

function isEntirelyInserted(node: DocumentNodeWithRange): boolean {
  // Check node itself
  if (node.paragraphStatus !== 'inserted') return false;
  
  // Check additional paragraphs
  if (node.additionalParagraphStatuses && node.additionalParagraphStatuses.length > 0) {
    if (!node.additionalParagraphStatuses.every(status => status === 'inserted')) {
      return false;
    }
  }
  
  // Check children recursively
  if (node.children && node.children.length > 0) {
    return node.children.every(child => isEntirelyInserted(child));
  }
  
  return true;
}
  
  for (const node of combinedStructure) {
    const isDeleted = isEntirelyDeleted(node);
    const isInserted = isEntirelyInserted(node);
    
    if (isDeleted) {
      // Use originalDisplayNumber for display, internal sectionNumber for tracking
      const displayNum = node.originalDisplayNumber || node.sectionNumber;
      structuralChanges.push({
        type: 'section-deleted',
        sectionNumber: displayNum,
        sectionTitle: node.originalText || node.text,
        fullContent: getFullSectionContent(node),
        subsections: getSubsectionNumbers(node),
      });
      deletedSections.add(normalizeSectionNumber(node.sectionNumber));
    } else if (isInserted) {
      // Use amendedDisplayNumber for display, internal sectionNumber for tracking
      const displayNum = node.amendedDisplayNumber || node.sectionNumber;
      structuralChanges.push({
        type: 'section-inserted',
        sectionNumber: displayNum,
        sectionTitle: node.text,
        fullContent: getFullSectionContent(node),
        subsections: getSubsectionNumbers(node),
      });
      insertedSections.add(normalizeSectionNumber(node.sectionNumber));
    }
  }
  
  return {
    structuralChanges,
    unmatchedOriginalSections: deletedSections,
    unmatchedAmendedSections: insertedSections,
  };
}

function normalizeHeaderForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(article|section|clause)\s+\d+[.:)]*\s*/i, '')
    .replace(/^\d+[.:)]*\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeHeaderSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeHeaderForMatching(text1);
  const norm2 = normalizeHeaderForMatching(text2);
  
  if (norm1 === norm2) return 1.0;
  
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  
  let overlap = 0;
  for (const w of Array.from(words1)) { 
    if (words2.has(w)) overlap++;
  }
  
  const maxLen = Math.max(words1.size, words2.size);
  return maxLen > 0 ? overlap / maxLen : 0;
}

function getSubsectionNumbers(node: DocumentNodeWithRange): string[] {
  const result: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      result.push(child.sectionNumber);
      result.push(...getSubsectionNumbers(child));
    }
  }
  return result;
}

function getFullSectionContent(node: DocumentNodeWithRange, isTopLevel: boolean = true): string {
  // For top-level: just use text (no section number prefix)
  // For children: prepend display section number like "(i)", "(a)"
  const headerText = node.combinedText || node.text || '';
  
  let nodeContent: string;
  if (isTopLevel) {
    nodeContent = headerText;
  } else {
    // Use display number for children (from w:numPr)
    const displayNum = node.originalDisplayNumber || node.amendedDisplayNumber || '';
    nodeContent = displayNum ? `${displayNum} ${headerText}` : headerText;
  }
  
  const additionalParas = node.combinedAdditionalParagraphs || node.additionalParagraphs || [];
  const allParas = [nodeContent, ...additionalParas].filter(t => t && t.trim());
  let content = allParas.join('\r');
  
  if (node.children) {
    for (const child of node.children) {
      const childContent = getFullSectionContent(child, false);
      if (childContent) {
        if (content) {
          content += '\r';
        }
        content += childContent;
      }
    }
  }
  
  return content;
}

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyResult(): TrackChangeExtractionResults {
  return {
    wordLevelTrackChanges: [],
    fullSentenceInsertions: [],
    fullSentenceDeletions: [],
    structuralChanges: [],
    summary: {
      totalSentencesWithChanges: 0,
      totalFullSentenceInsertions: 0,
      totalFullSentenceDeletions: 0,
      totalDeletions: 0,
      totalInsertions: 0,
      totalSectionsDeleted: 0,
      totalSectionsInserted: 0,
    },
  };
}