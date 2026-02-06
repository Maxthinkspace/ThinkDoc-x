import * as React from 'react';
import { makeStyles } from '@fluentui/react-components';
import type { SourceAnnotation } from '@/src/services/api';

const useStyles = makeStyles({
  container: {
    lineHeight: '1.6',
  },
  deletion: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    textDecoration: 'line-through',
    padding: '1px 4px',
    borderRadius: '2px',
    marginLeft: '1px',
    marginRight: '1px',
  },
  insertion: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: 'bold' as const,
    padding: '1px 4px',
    borderRadius: '2px',
    marginLeft: '1px',
    marginRight: '1px',
  },
  commentHighlight: {
    backgroundColor: '#fff3cd',
    borderBottom: '2px solid #ffc107',
    padding: '1px 2px',
    borderRadius: '2px',
  },
});

/**
 * Strip Word control characters
 */
const stripWordControlCharacters = (text: string): string => {
  return text.replace(/[\u0005\u0013\u0014\u0015\u0001\u0002]/g, '');
};

export interface AnnotationPreviewInlineProps {
  sourceAnnotation: SourceAnnotation;
  sentence?: string;
  defaultExpanded?: boolean;
}

/**
 * Render inline preview of an annotation with proper positioning.
 * 
 * For track changes:
 * - Builds the combined sentence from sentenceFragments (or uses amendedSentence)
 * - Renders deletions and additions at their sentence-relative positions
 * 
 * For comments:
 * - Highlights the selected text within the sentence
 */
export const AnnotationPreviewInline: React.FC<AnnotationPreviewInlineProps> = ({
  sourceAnnotation,
  sentence,
}) => {
  const styles = useStyles();

  // [DEBUG] Log what data reaches the UI component
  console.log(`[DEBUG AnnotationPreviewInline] Rendering annotation type: ${sourceAnnotation.type}`);
  console.log(`[DEBUG AnnotationPreviewInline] sentence prop: "${sentence?.substring(0, 50)}..."`);
  
  if (sourceAnnotation.type === 'trackChange') {
    console.log(`[DEBUG AnnotationPreviewInline] trackChange data:`);
    console.log(`[DEBUG AnnotationPreviewInline]   sectionNumber: ${sourceAnnotation.sectionNumber}`);
    console.log(`[DEBUG AnnotationPreviewInline]   amendedSentence: "${sourceAnnotation.amendedSentence?.substring(0, 50)}..."`);
    console.log(`[DEBUG AnnotationPreviewInline]   deleted:`, sourceAnnotation.deleted);
    console.log(`[DEBUG AnnotationPreviewInline]   added:`, sourceAnnotation.added);
    console.log(`[DEBUG AnnotationPreviewInline]   sentenceFragments:`, sourceAnnotation.sentenceFragments);
  }
  
  if (sourceAnnotation.type === 'comment') {
    console.log(`[DEBUG AnnotationPreviewInline] comment data:`);
    console.log(`[DEBUG AnnotationPreviewInline]   sectionNumber: ${sourceAnnotation.sectionNumber}`);
    console.log(`[DEBUG AnnotationPreviewInline]   selectedText: "${sourceAnnotation.selectedText}"`);
    console.log(`[DEBUG AnnotationPreviewInline]   commentContent: "${sourceAnnotation.commentContent}"`);
    console.log(`[DEBUG AnnotationPreviewInline]   startOffset: ${sourceAnnotation.startOffset}`);
    console.log(`[DEBUG AnnotationPreviewInline]   endOffset: ${sourceAnnotation.endOffset}`);
  }

  if (sourceAnnotation.type === 'trackChange') {
    return renderTrackChangePreview(sourceAnnotation, styles);
  }

  if (sourceAnnotation.type === 'comment') {
    return renderCommentPreview(sourceAnnotation, sentence, styles);
  }

  if (sourceAnnotation.type === 'fullSentenceDeletion') {
    return (
      <span className={styles.deletion}>
        {stripWordControlCharacters(sourceAnnotation.deletedText)}
      </span>
    );
  }

  if (sourceAnnotation.type === 'fullSentenceInsertion') {
    return (
      <span className={styles.insertion}>
        {stripWordControlCharacters(sourceAnnotation.insertedText)}
      </span>
    );
  }

  return <span>{sentence || 'No preview available'}</span>;
};

/**
 * Render track change preview using sentence-relative offsets.
 * 
 * Algorithm:
 * 1. Build the combined sentence (base text that includes both insertions content)
 * 2. Create markers for deletions (to be inserted) and additions (to be highlighted)
 * 3. Render the sentence with markers at correct positions
 */
function renderTrackChangePreview(
  sourceAnnotation: Extract<SourceAnnotation, { type: 'trackChange' }>,
  styles: ReturnType<typeof useStyles>
): React.ReactNode {
  const { amendedSentence, deleted, added, sentenceFragments } = sourceAnnotation;

  // Step 1: Build the combined sentence
  // If we have sentenceFragments, join their textFragment values
  // Otherwise fall back to amendedSentence
  let combinedSentence: string;
  
  if (sentenceFragments && sentenceFragments.length > 0) {
    // Join all fragments (each contains the combined text for that section)
    combinedSentence = sentenceFragments
      .map(f => f.textFragment || '')
      .join(' ')
      .trim();
  } else {
    combinedSentence = amendedSentence || '';
  }

  const baseText = stripWordControlCharacters(combinedSentence);

  // If no base text and no changes, show fallback
  if (!baseText && (!deleted?.length) && (!added?.length)) {
    return <span>No preview available</span>;
  }

  // If no base text but we have changes, show changes only
  if (!baseText) {
    return (
      <>
        {deleted?.map((d, idx) => (
          <span key={`del-${idx}`} className={styles.deletion}>
            {stripWordControlCharacters(d.text)}
          </span>
        ))}
        {added?.map((a, idx) => (
          <span key={`add-${idx}`} className={styles.insertion}>
            {stripWordControlCharacters(a.text)}
          </span>
        ))}
      </>
    );
  }

  // Step 2: Build markers for rendering
  interface RenderMarker {
    type: 'deletion' | 'addition';
    text: string;
    startOffset: number;
    endOffset: number;
  }

  const markers: RenderMarker[] = [];

  // Add deletion markers
  // Deletions need to be INSERTED into the text at their position
  // (they're not in the amended/combined text)
  for (const d of (deleted || [])) {
    if (d.startOffset !== undefined && d.startOffset >= 0) {
      markers.push({
        type: 'deletion',
        text: stripWordControlCharacters(d.text),
        startOffset: d.startOffset,
        endOffset: d.endOffset ?? (d.startOffset + d.text.length),
      });
    }
  }

  // Add addition markers
  // Additions are already IN the combined text, we just highlight them
  for (const a of (added || [])) {
    if (a.startOffset !== undefined && a.startOffset >= 0) {
      markers.push({
        type: 'addition',
        text: stripWordControlCharacters(a.text),
        startOffset: a.startOffset,
        endOffset: a.endOffset ?? (a.startOffset + a.text.length),
      });
    }
  }

  // Sort by position (deletions and additions can be interleaved)
  markers.sort((a, b) => a.startOffset - b.startOffset);

  // If no valid markers, just show the base text
  if (markers.length === 0) {
    return <span>{baseText}</span>;
  }

  // Step 3: Render the combined text with markers
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  for (const marker of markers) {
    // Add unchanged text before this marker
    if (marker.startOffset > currentIndex) {
      const textBefore = baseText.substring(currentIndex, marker.startOffset);
      if (textBefore) {
        parts.push(<span key={`text-${currentIndex}`}>{textBefore}</span>);
      }
    currentIndex = marker.startOffset;
     }

     if (marker.type === 'deletion') {
       // Deletions are NOT in baseText - insert them at this position
       parts.push(
         <span key={`del-${marker.startOffset}`} className={styles.deletion}>
           {marker.text}
         </span>
       );
       // Don't advance currentIndex further - deletion doesn't consume base text
     } else {
       // Additions ARE in baseText - highlight them
       parts.push(
         <span key={`add-${marker.startOffset}`} className={styles.insertion}>
           {marker.text}
         </span>
       );
       currentIndex = marker.startOffset + marker.text.length;
    }
  }

  // Add remaining text after last marker
  if (currentIndex < baseText.length) {
    parts.push(<span key="text-end">{baseText.substring(currentIndex)}</span>);
  }

  return <div className={styles.container}>{parts}</div>;
}

/**
 * Render comment preview with highlighted selected text
 */
function renderCommentPreview(
  sourceAnnotation: Extract<SourceAnnotation, { type: 'comment' }>,
  sentence: string | undefined,
  styles: ReturnType<typeof useStyles>
): React.ReactNode {
  const { selectedText, commentContent, startOffset, endOffset } = sourceAnnotation;
  const displayText = stripWordControlCharacters(sentence || selectedText || '');
  const cleanSelectedText = stripWordControlCharacters(selectedText || '');

  if (!displayText) {
    return <span>No preview available</span>;
  }

  // Use offset if available, otherwise fall back to indexOf
  let highlightStart = startOffset ?? -1;
  let highlightEnd = endOffset ?? -1;

  if (highlightStart < 0 && cleanSelectedText) {
    highlightStart = displayText.indexOf(cleanSelectedText);
    highlightEnd = highlightStart >= 0 ? highlightStart + cleanSelectedText.length : -1;
  }

  if (highlightStart >= 0 && highlightEnd > highlightStart) {
    return (
      <div className={styles.container}>
        {highlightStart > 0 && (
          <span>{displayText.substring(0, highlightStart)}</span>
        )}
        <span className={styles.commentHighlight} title={commentContent}>
          {displayText.substring(highlightStart, highlightEnd)}
        </span>
        {highlightEnd < displayText.length && (
          <span>{displayText.substring(highlightEnd)}</span>
        )}
      </div>
    );
  }

  // Fallback: just highlight the selected text if found
  if (cleanSelectedText) {
    return (
      <span className={styles.commentHighlight} title={commentContent}>
        {cleanSelectedText}
      </span>
    );
  }

  return <span>{displayText}</span>;
}

export default AnnotationPreviewInline;