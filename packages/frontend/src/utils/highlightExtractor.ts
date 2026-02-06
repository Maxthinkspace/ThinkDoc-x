import type { DocumentNodeWithRange, SentenceWithSource } from '@/src/types/documents';
import type { AffectedSentence } from '@/src/types/documents';
import { findSectionByOoxmlIndex } from '@/src/utils/documentParserHelpers';
import {
  extractCompleteSentencesAndIncomplete,
  normalizeText,
  hasSignificantOverlap,
  extractAllSentencesWithSources,
  findBestMatchingSentence,
} from '@/src/utils/annotationExtractionHelpers';

// ========================================
// TYPES
// ========================================

export interface OOXMLHighlight {
  id: string;
  text: string;
  color: string;
  ooxmlParagraphIndex: number;
  startOffsetInParagraph: number;
  endOffsetInParagraph: number;
}

interface SentenceWithOffset {
  id: string;
  sentence: string;
  startOffset: number;
  endOffset: number;
}

export interface HighlightExtractionResultOOXML {
  highlightId: string;
  topLevelSectionNumbers: string[];
  sectionNumbers: string[];
  sectionNumber: string;  // Primary section for offset matching
  selectedText: string;
  highlightColor: string;
  startOffset: number;    // Section-relative
  endOffset: number;      // Section-relative
  affectedSentences: AffectedSentence[];
}

export interface HighlightExtractionResultsOOXML {
  highlights: HighlightExtractionResultOOXML[];
  summary: {
    totalHighlights: number;
  };
}

// ========================================
// MAIN ENTRY POINT
// ========================================

/**
 * Extract highlights from OOXML and map to document structure.
 * More reliable than Word API for detecting highlight boundaries.
 */
export function extractHighlightsFromOOXML(
  xmlDoc: Document,
  combinedStructure: DocumentNodeWithRange[]
): HighlightExtractionResultsOOXML {
  console.log('[highlightExtractorOOXML] Starting OOXML highlight extraction...');
  
  // Step 1: Extract raw highlights from OOXML
  const rawHighlights = extractRawHighlights(xmlDoc);
  console.log(`[highlightExtractorOOXML] Found ${rawHighlights.length} raw highlights`);
  
  // Step 2: Map to document structure
  const results = mapHighlightsToStructure(rawHighlights, combinedStructure);
  
  console.log(`[highlightExtractorOOXML] Mapped ${results.highlights.length} highlights to structure`);
  return results;
}

// ========================================
// STEP 1: EXTRACT RAW HIGHLIGHTS FROM OOXML
// ========================================

/**
 * Extract highlighted text from OOXML by finding <w:highlight> elements.
 * Merges adjacent highlighted runs of the same color within a paragraph.
 * Tracks character offsets within each paragraph.
 */
function extractRawHighlights(xmlDoc: Document): OOXMLHighlight[] {
  const highlights: OOXMLHighlight[] = [];
  let highlightIdCounter = 0;
  
  // Get body element
  const body = xmlDoc.getElementsByTagNameNS(
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "body"
  )[0] || xmlDoc.getElementsByTagNameNS("*", "body")[0];
  
  if (!body) {
    console.warn('[highlightExtractorOOXML] No <w:body> found');
    return highlights;
  }
  
  const paragraphs = body.getElementsByTagNameNS("*", "p");
  
  for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
    const para = paragraphs[paraIndex];
    
    // Track current highlight being built (for merging adjacent runs)
    let currentHighlight: { text: string; color: string; startOffset: number } | null = null;
    let paragraphOffset = 0;  // Track position within paragraph
    
    // Process runs in document order
    const runs = para.getElementsByTagNameNS("*", "r");
    
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      
      // Get highlight color from run properties
      const highlightColor = getRunHighlightColor(run);
      
      // Extract text from run
      const runText = extractTextFromRun(run);
      
      if (!runText) continue;
      
      const runStartOffset = paragraphOffset;
      const runEndOffset = paragraphOffset + runText.length;
      
      if (highlightColor) {
        // This run is highlighted
        if (currentHighlight && currentHighlight.color === highlightColor) {
          // Same color - merge
          currentHighlight.text = mergeText(currentHighlight.text, runText);
        } else {
          // Different color or new highlight - save previous and start new
          if (currentHighlight && currentHighlight.text.trim()) {
            highlights.push({
              id: `ooxml-hl-${highlightIdCounter++}`,
              text: currentHighlight.text.trim(),
              color: currentHighlight.color,
              ooxmlParagraphIndex: paraIndex,
              startOffsetInParagraph: currentHighlight.startOffset,
              endOffsetInParagraph: paragraphOffset,
            });
          }
          currentHighlight = { 
            text: runText, 
            color: highlightColor, 
            startOffset: runStartOffset 
          };
        }
      } else {
        // Not highlighted - finalize current highlight if exists
        if (currentHighlight && currentHighlight.text.trim()) {
          highlights.push({
            id: `ooxml-hl-${highlightIdCounter++}`,
            text: currentHighlight.text.trim(),
            color: currentHighlight.color,
            ooxmlParagraphIndex: paraIndex,
            startOffsetInParagraph: currentHighlight.startOffset,
            endOffsetInParagraph: paragraphOffset,
          });
        }
        currentHighlight = null;
      }
      
      paragraphOffset = runEndOffset;
    }
    
    // Finalize any pending highlight at end of paragraph
    if (currentHighlight && currentHighlight.text.trim()) {
      highlights.push({
        id: `ooxml-hl-${highlightIdCounter++}`,
        text: currentHighlight.text.trim(),
        color: currentHighlight.color,
        ooxmlParagraphIndex: paraIndex,
        startOffsetInParagraph: currentHighlight.startOffset,
        endOffsetInParagraph: paragraphOffset,
      });
    }
  }
  
  return highlights;
}

/**
 * Get highlight color from a run's properties.
 * Returns null if not highlighted.
 */
function getRunHighlightColor(run: Element): string | null {
  const rPr = run.getElementsByTagNameNS("*", "rPr")[0];
  if (!rPr) return null;
  
  const highlight = rPr.getElementsByTagNameNS("*", "highlight")[0];
  if (!highlight) return null;
  
  const color = highlight.getAttributeNS(
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "val"
  ) || highlight.getAttribute("w:val");
  
  return color || null;
}

/**
 * Extract text content from a run element.
 */
function extractTextFromRun(run: Element): string {
  let text = '';
  
  const children = run.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    
    const el = child as Element;
    const localName = el.localName || el.nodeName.replace(/^w:/, '');
    
    if (localName === 't') {
      text += el.textContent || '';
    } else if (localName === 'tab' || localName === 'br') {
      text += ' ';
    }
  }
  
  return text;
}

/**
 * Merge two text segments, adding space if needed between words.
 */
function mergeText(existing: string, newText: string): string {
  if (!existing) return newText;
  if (!newText) return existing;
  
  const needsSpace = /\w$/.test(existing) && /^\w/.test(newText);
  return needsSpace ? existing + ' ' + newText : existing + newText;
}

// ========================================
// STEP 2: MAP TO DOCUMENT STRUCTURE
// ========================================

/**
 * Extract sentences from section text with their offset ranges.
 */
function extractSentencesWithOffsetsFromText(
  text: string,
  sectionNumber: string
): SentenceWithOffset[] {
  const sentences: SentenceWithOffset[] = [];
  
  if (!text || !text.trim()) {
    return sentences;
  }
  
  const { complete, incomplete } = extractCompleteSentencesAndIncomplete(text);
  
  let currentOffset = 0;
  let sentenceCounter = 0;
  
  for (const sentence of complete) {
    const startIdx = text.indexOf(sentence, currentOffset);
    if (startIdx === -1) {
      sentenceCounter++;
      sentences.push({
        id: `${sectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
        sentence,
        startOffset: currentOffset,
        endOffset: currentOffset + sentence.length,
      });
      currentOffset += sentence.length;
    } else {
      sentenceCounter++;
      sentences.push({
        id: `${sectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
        sentence,
        startOffset: startIdx,
        endOffset: startIdx + sentence.length,
      });
      currentOffset = startIdx + sentence.length;
    }
  }
  
  if (incomplete) {
    const startIdx = text.indexOf(incomplete, currentOffset);
    sentenceCounter++;
    sentences.push({
      id: `${sectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
      sentence: incomplete,
      startOffset: startIdx !== -1 ? startIdx : currentOffset,
      endOffset: startIdx !== -1 ? startIdx + incomplete.length : currentOffset + incomplete.length,
    });
  }
  
  return sentences;
}

/**
 * Find sentences that overlap with a given offset range.
 */
function findOverlappingSentences(
  sentences: SentenceWithOffset[],
  rangeStart: number,
  rangeEnd: number
): AffectedSentence[] {
  const affected: AffectedSentence[] = [];
  
  for (const sentence of sentences) {
    const overlaps = sentence.startOffset < rangeEnd && rangeStart < sentence.endOffset;
    if (overlaps) {
      affected.push({
        sentenceId: sentence.id,
        sentence: sentence.sentence,
      });
    }
  }
  
  return affected;
}

/**
 * Fallback: find sentences by text matching
 */
function findSentencesByTextMatch(
  sentences: SentenceWithOffset[],
  selectedText: string
): AffectedSentence[] {
  const affected: AffectedSentence[] = [];
  const normalizedSelected = normalizeText(selectedText);
  
  if (!normalizedSelected || normalizedSelected.length < 3) {
    return affected;
  }
  
  for (const sentence of sentences) {
    const normalizedSentence = normalizeText(sentence.sentence);
    
    if (
      normalizedSentence.includes(normalizedSelected) ||
      normalizedSelected.includes(normalizedSentence) ||
      hasSignificantOverlap(normalizedSelected, normalizedSentence)
    ) {
      affected.push({
        sentenceId: sentence.id,
        sentence: sentence.sentence,
      });
    }
  }
  
  return affected;
}

/**
 * Map OOXML highlights to document structure using combinedStructure.
 * Computes section-relative offsets by finding highlight text within section's combined text.
 */
function mapHighlightsToStructure(
  highlights: OOXMLHighlight[],
  combinedStructure: DocumentNodeWithRange[]
): HighlightExtractionResultsOOXML {
  const results: HighlightExtractionResultOOXML[] = [];

  // Build full cross-section sentence cache ONCE for the entire document
  const allCrossSectionSentences = extractAllSentencesWithSources(
    combinedStructure,
    'highlightExtractor'
  );
  console.log(`[highlightExtractor] Built cross-section sentence cache: ${allCrossSectionSentences.length} sentences`);

  // Keep section-level cache for offset calculations (still useful)
  const sectionSentencesCache = new Map<string, SentenceWithOffset[]>();

  for (const highlight of highlights) {
    // Find section containing this OOXML paragraph index
    const sectionInfo = findSectionByOoxmlIndex(
      highlight.ooxmlParagraphIndex, 
      combinedStructure
    );
    
    let sectionNumber = 'unknown';
    let sectionNumbers: string[] = ['unknown'];
    let topLevelSectionNumbers: string[] = ['unknown'];
    let startOffset = 0;
    let endOffset = 0;
    let affectedSentences: AffectedSentence[] = [];
    
    if (sectionInfo) {
      sectionNumber = sectionInfo.sectionNumber;
      sectionNumbers = [sectionInfo.sectionNumber];
      topLevelSectionNumbers = [sectionInfo.topLevelSectionNumber];
      
      const sectionNode = findSectionNode(sectionInfo.sectionNumber, combinedStructure);
      if (sectionNode) {
        const sectionCombinedText = getSectionCombinedText(sectionNode);
        
        // Find highlight text position within section's combined text
        const pos = sectionCombinedText.indexOf(highlight.text);
        if (pos !== -1) {
          startOffset = pos;
          endOffset = pos + highlight.text.length;
        } else {
          const normalizedSection = normalizeText(sectionCombinedText);
          const normalizedHighlight = normalizeText(highlight.text);
          const normalizedPos = normalizedSection.indexOf(normalizedHighlight);
          if (normalizedPos !== -1) {
            startOffset = normalizedPos;
            endOffset = normalizedPos + highlight.text.length;
          }
        }
        
        // Extract sentences with caching
        let sectionSentences = sectionSentencesCache.get(sectionInfo.sectionNumber);
        if (!sectionSentences) {
          sectionSentences = extractSentencesWithOffsetsFromText(
            sectionCombinedText,
            sectionInfo.sectionNumber
          );
          sectionSentencesCache.set(sectionInfo.sectionNumber, sectionSentences);
        }
        
        // Find the FULL cross-section sentence containing this highlight
        const crossSectionSentence = findBestMatchingSentence(
          allCrossSectionSentences,
          sectionInfo.sectionNumber,
          highlight.text,
          startOffset,
          endOffset
        );

        if (crossSectionSentence) {
          // Use the full cross-section sentence
          affectedSentences = [{
            sentenceId: crossSectionSentence.id,
            sentence: crossSectionSentence.sentence,
            sourceComponents: crossSectionSentence.sourceComponents,
          }];
          console.log(`[highlightExtractor] Highlight ${highlight.id} - found cross-section sentence:`);
          console.log(`[highlightExtractor]   sentenceId: ${crossSectionSentence.id}`);
          console.log(`[highlightExtractor]   spans ${crossSectionSentence.sourceComponents.length} section(s): ${crossSectionSentence.sourceComponents.map(c => c.sectionNumber).join(', ')}`);
        } else {
          // Fallback: use section-level sentences
          affectedSentences = findOverlappingSentences(sectionSentences, startOffset, endOffset);

          if (affectedSentences.length === 0 && highlight.text.trim()) {
            affectedSentences = findSentencesByTextMatch(sectionSentences, highlight.text);
          }
        }
      }
    } else {
      console.log(`[highlightExtractorOOXML] No section found for ooxmlIndex=${highlight.ooxmlParagraphIndex}`);
    }
    
    results.push({
      highlightId: highlight.id,
      topLevelSectionNumbers,
      sectionNumbers,
      sectionNumber,
      selectedText: highlight.text,
      highlightColor: highlight.color,
      startOffset,
      endOffset,
      affectedSentences,
    });
    
    // console.log(`[DEBUG 2.6] Highlight ${highlight.id}: section=${sectionNumber} range=[${startOffset}-${endOffset}] color=${highlight.color}`);
    // console.log(`[DEBUG 2.6]   text: "${highlight.text}"`);
  }
  
  return {
    highlights: results,
    summary: {
      totalHighlights: results.length,
    },
  };
}

/**
 * Find a section node by section number
 */
function findSectionNode(
  sectionNumber: string, 
  structure: DocumentNodeWithRange[]
): DocumentNodeWithRange | null {
  for (const node of structure) {
    if (node.sectionNumber === sectionNumber) {
      return node;
    }
    if (node.children) {
      const found = findSectionNode(sectionNumber, node.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get combined text for a section (heading + content + additional paragraphs)
 * Heading is included first so offsets start from beginning of heading.
 */
function getSectionCombinedText(node: DocumentNodeWithRange): string {
  const heading = node.combinedSectionHeading || node.sectionHeading || '';
  const contentText = node.combinedText || node.text || '';
  const additionalParas = node.combinedAdditionalParagraphs || node.additionalParagraphs || [];

  const allParas = [heading, contentText, ...additionalParas].filter(t => t && t.trim());
  return allParas.join('\r');
}