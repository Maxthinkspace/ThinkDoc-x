import type {
  DocumentNodeWithRange,
  ParagraphMapping,
  SentenceWithSource,
  CommentReply,
  CommentInfo,
  CommentsMappedToLevel,
  CommentExtractionResult,
  CommentExtractionResults,
  AffectedSentence,
} from '@/src/types/documents';
import type { ParsedDocumentWithRanges } from '@/src/types/documents';
import { findSectionByOoxmlIndex } from '@/src/utils/documentParserHelpers';
import {
  extractAllSentencesWithSources,
  getTopLevelSectionNumber,
  normalizeText,
  hasSignificantOverlap,
  extractCompleteSentencesAndIncomplete,
  findBestMatchingSentence,
} from '@/src/utils/annotationExtractionHelpers';

/**
 * Raw comment data from OOXML
 */
interface OOXMLComment {
  id: string;
  numericId: number;
  selectedText: string;
  ooxmlParagraphIndex: number;
  startOffsetInParagraph: number;
  endOffsetInParagraph: number;
  content: string;
  author: string;
  date: Date;
  replies: CommentReply[];
}

/**
 * Parsed comment from comments.xml
 */
interface ParsedCommentContent {
  id: number;
  content: string;
  author: string;
  date: Date;
}

/**
 * Sentence with its offset range within the section
 */
interface SentenceWithOffset {
  id: string;
  sentence: string;
  startOffset: number;
  endOffset: number;
}

// ============================================================================
// OOXML-BASED COMMENT EXTRACTION
// ============================================================================

/**
 * Extract comments from OOXML and map to document structure.
 * More reliable than Word API for detecting comment boundaries and offsets.
 */
export function extractCommentsFromOOXML(
  xmlDoc: Document,
  commentsXmlDoc: Document | null,
  combinedStructure: DocumentNodeWithRange[]
): CommentExtractionResults {
  console.log('[commentExtractorOOXML] Starting OOXML comment extraction...');
  
  // Step 1: Parse comments.xml to get comment content
  const commentContents = commentsXmlDoc 
    ? parseCommentsXml(commentsXmlDoc) 
    : new Map<number, ParsedCommentContent>();
  console.log(`[commentExtractorOOXML] Parsed ${commentContents.size} comments from comments.xml`);
  
  // Step 2: Extract comment ranges from document body
  const rawComments = extractCommentRanges(xmlDoc, commentContents);
  console.log(`[commentExtractorOOXML] Found ${rawComments.length} comment ranges in document`);
  
  // Step 3: Map to document structure
  const results = mapCommentsToStructureOOXML(rawComments, combinedStructure);
  
  console.log(`[commentExtractorOOXML] Mapped ${results.comments.length} comments to structure`);
  return results;
}

/**
 * Parse comments.xml to extract comment content, author, date
 */
function parseCommentsXml(commentsXmlDoc: Document): Map<number, ParsedCommentContent> {
  const result = new Map<number, ParsedCommentContent>();
  
  const comments = commentsXmlDoc.getElementsByTagNameNS("*", "comment");
  
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    
    const idStr = comment.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "id"
    ) || comment.getAttribute("w:id");
    
    if (!idStr) continue;
    
    const id = parseInt(idStr);
    
    const author = comment.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "author"
    ) || comment.getAttribute("w:author") || '';
    
    const dateStr = comment.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "date"
    ) || comment.getAttribute("w:date");
    
    const date = dateStr ? new Date(dateStr) : new Date();
    
    // Extract comment text from <w:t> elements
    let content = '';
    const textElements = comment.getElementsByTagNameNS("*", "t");
    for (let j = 0; j < textElements.length; j++) {
      content += textElements[j].textContent || '';
    }
    
    result.set(id, { id, content: content.trim(), author, date });
  }
  
  return result;
}

/**
 * Extract comment ranges from document body.
 * Tracks character offsets and collects selected text between markers.
 */
function extractCommentRanges(
  xmlDoc: Document,
  commentContents: Map<number, ParsedCommentContent>
): OOXMLComment[] {
  const comments: OOXMLComment[] = [];
  
  // Track active comment ranges: id -> { startOffset, text }
  const activeRanges = new Map<number, { startOffset: number; text: string; paraIndex: number }>();
  
  const body = xmlDoc.getElementsByTagNameNS("*", "body")[0];
  if (!body) {
    console.warn('[commentExtractorOOXML] No <w:body> found');
    return comments;
  }
  
  const paragraphs = body.getElementsByTagNameNS("*", "p");
  
  for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
    const para = paragraphs[paraIndex];
    let paragraphOffset = 0;
    
    // Process all child nodes in document order
    const walker = createNodeWalker(para);
    let node: Node | null;
    
    while ((node = walker.nextNode()) !== null) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      
      const el = node as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      
      if (localName === 'commentRangeStart') {
        const idStr = el.getAttributeNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "id"
        ) || el.getAttribute("w:id");
        
        if (idStr) {
          const id = parseInt(idStr);
          activeRanges.set(id, { 
            startOffset: paragraphOffset, 
            text: '',
            paraIndex 
          });
        }
      } else if (localName === 'commentRangeEnd') {
        const idStr = el.getAttributeNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "id"
        ) || el.getAttribute("w:id");
        
        if (idStr) {
          const id = parseInt(idStr);
          const range = activeRanges.get(id);
          
          if (range) {
            const commentContent = commentContents.get(id);
            
            comments.push({
              id: `comment-${id}`,
              numericId: id,
              selectedText: range.text.trim(),
              ooxmlParagraphIndex: range.paraIndex,
              startOffsetInParagraph: range.startOffset,
              endOffsetInParagraph: paragraphOffset,
              content: commentContent?.content || '',
              author: commentContent?.author || '',
              date: commentContent?.date || new Date(),
              replies: [], // TODO: Parse extended comments for replies
            });
            
            activeRanges.delete(id);
          }
        }
      } else if (localName === 't') {
        const text = el.textContent || '';
        
        // Add text to all active ranges
        activeRanges.forEach(range => {
          range.text += text;
        });
        
        paragraphOffset += text.length;
      } else if (localName === 'tab' || localName === 'br') {
        // Add space to all active ranges
        activeRanges.forEach(range => {
          range.text += ' ';
        });
        
        paragraphOffset += 1;
      }
    }
  }
  
  return comments;
}

/**
 * Create a tree walker for processing paragraph nodes in document order
 */
function createNodeWalker(para: Element): TreeWalker {
  return document.createTreeWalker(
    para,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: Node) => {
        const el = node as Element;
        const localName = el.localName || el.nodeName.replace(/^w:/, '');
        
        // Accept elements we care about
        if (['commentRangeStart', 'commentRangeEnd', 't', 'tab', 'br', 'r', 'p'].includes(localName)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
}

/**
 * Map OOXML comments to document structure.
 * Computes section-relative offsets.
 */
function mapCommentsToStructureOOXML(
  comments: OOXMLComment[],
  combinedStructure: DocumentNodeWithRange[]
): CommentExtractionResults {
  const results: CommentExtractionResult[] = [];

  // Build full cross-section sentence cache ONCE for the entire document
  const allCrossSectionSentences = extractAllSentencesWithSources(
    combinedStructure,
    'commentExtractor'
  );
  console.log(`[commentExtractor] Built cross-section sentence cache: ${allCrossSectionSentences.length} sentences`);

  // Keep section-level cache for offset calculations (still useful)
  const sectionSentencesCache = new Map<string, SentenceWithOffset[]>();

  for (const comment of comments) {
    const sectionInfo = findSectionByOoxmlIndex(
      comment.ooxmlParagraphIndex,
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
        
        // Find comment's selected text position within section
        const pos = sectionCombinedText.indexOf(comment.selectedText);
        if (pos !== -1) {
          startOffset = pos;
          endOffset = pos + comment.selectedText.length;
        } else {
          const normalizedSection = normalizeText(sectionCombinedText);
          const normalizedSelected = normalizeText(comment.selectedText);
          const normalizedPos = normalizedSection.indexOf(normalizedSelected);
          if (normalizedPos !== -1) {
            startOffset = normalizedPos;
            endOffset = normalizedPos + comment.selectedText.length;
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
        
        // Find the FULL cross-section sentence containing this comment
        const crossSectionSentence = findBestMatchingSentence(
          allCrossSectionSentences,
          sectionInfo.sectionNumber,
          comment.selectedText,
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
        } else {
          // Fallback: use section-level sentences
          affectedSentences = findOverlappingSentences(sectionSentences, startOffset, endOffset);

          if (affectedSentences.length === 0 && comment.selectedText.trim()) {
            affectedSentences = findSentencesByTextMatch(sectionSentences, comment.selectedText);
          }

        }
      }
    }
    
    results.push({
      commentId: comment.id,
      sectionNumbers,
      topLevelSectionNumbers,
      sectionNumber,
      commentContent: comment.content,
      selectedText: comment.selectedText,
      affectedSentences,
      author: comment.author,
      date: comment.date,
      replies: comment.replies,
      startOffset,
      endOffset,
    });
    
    // console.log(`[DEBUG 2.5] Comment ${comment.id}: section=${sectionNumber} range=[${startOffset}-${endOffset}]`);
    // console.log(`[DEBUG 2.5]   selectedText: "${comment.selectedText}"`);
    // console.log(`[DEBUG 2.5]   content: "${comment.content}"`);
  }
  
  const totalAffectedSentences = results.reduce((sum, c) => sum + c.affectedSentences.length, 0);
  
  return {
    comments: results,
    summary: {
      totalComments: results.length,
      totalReplies: results.reduce((sum, c) => sum + c.replies.length, 0),
      totalAffectedSentences,
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


// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Create empty result
 */
function createEmptyResult(): CommentExtractionResults {
  return {
    comments: [],
    summary: {
      totalComments: 0,
      totalReplies: 0,
      totalAffectedSentences: 0,
    },
  };
}
