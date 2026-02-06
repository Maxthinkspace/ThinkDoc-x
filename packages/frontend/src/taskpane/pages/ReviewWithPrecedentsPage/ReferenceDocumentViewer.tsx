import React, { useRef, useEffect, useCallback } from "react";
import { makeStyles } from "@fluentui/react-components";
import type { DocumentNode } from '@/src/types/documents';

interface ReferenceDocumentViewerProps {
  structure: DocumentNode[];
  recitals?: string;
  searchText?: string | null;  // Text to search for (like Word's getTextRange)
}

const useStyles = makeStyles({
  viewerRoot: {
    fontFamily: "'Segoe UI', 'Arial', sans-serif",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#333",
    padding: "16px",
    // Ensure scrollability
    height: "100%",
    overflowY: "auto",
  },
  recitals: {
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px solid #e1e1e1",
  },
  recitalsTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#1976d2",
  },
  section: {
    marginBottom: "16px",
    padding: "8px",
    borderRadius: "4px",
    transition: "background-color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease",
  },
  sectionHighlighted: {
    backgroundColor: "#fff9c4",
    border: "2px solid #fbc02d",
    boxShadow: "0 0 8px rgba(251, 192, 45, 0.4)",
  },
  sectionLevel1: {
    fontSize: "16px",
    fontWeight: 700,
    marginTop: "20px",
    color: "#1976d2",
  },
  sectionLevel2: {
    fontSize: "15px",
    fontWeight: 600,
    marginTop: "16px",
    color: "#1976d2",
  },
  sectionLevel3: {
    fontSize: "14px",
    fontWeight: 600,
    marginTop: "12px",
    color: "#424242",
  },
  sectionNumber: {
    fontWeight: 700,
    marginRight: "8px",
  },
  sectionText: {
    display: "inline",
  },
  additionalParagraph: {
    marginTop: "8px",
    marginLeft: "24px",
    color: "#555",
  },
});

// ============================================
// HELPER: Normalize text for comparison (mirrors Word search behavior)
// ============================================
const normalizeTextForSearch = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\r\n\t]/g, ' ')  // Replace line breaks/tabs with spaces
    .replace(/\s+/g, ' ')       // Collapse multiple spaces
    .trim();
};

// ============================================
// HELPER: Get full text content from a node (heading + additional paragraphs)
// ============================================
const getNodeFullText = (node: DocumentNode): string => {
  let text = (node.sectionNumber || '') + ' ' + (node.text || '');
  if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    text += ' ' + node.additionalParagraphs.join(' ');
  }
  return text;
};

// ============================================
// HELPER: Flatten document tree into ordered array
// ============================================
const flattenStructure = (nodes: DocumentNode[]): DocumentNode[] => {
  const result: DocumentNode[] = [];
  
  const traverse = (nodeList: DocumentNode[]) => {
    for (const node of nodeList) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  
  traverse(nodes);
  return result;
};

// ============================================
// TEXT SEARCH: Mirrors getTextRange from taskpane.ts
// ============================================
const findSectionByText = (
  structure: DocumentNode[],
  searchText: string
): { sectionNumber: string; matchType: string } | null => {
  if (!searchText || !structure || structure.length === 0) return null;
  
  const allNodes = flattenStructure(structure);
  const normalizedSearch = normalizeTextForSearch(searchText);
  
  // Build combined text like Word's cross-paragraph search
  const SEP = ' '; // Section separator
  const nodeTexts = allNodes.map(node => normalizeTextForSearch(getNodeFullText(node)));
  const combinedText = nodeTexts.join(SEP);
  
  // Calculate start positions for each node in combined text
  const nodeStarts: number[] = [];
  let pos = 0;
  for (let i = 0; i < nodeTexts.length; i++) {
    nodeStarts.push(pos);
    pos += nodeTexts[i].length + SEP.length;
  }
  
  // Helper to find which node contains a given position
  const findNodeAtPosition = (offset: number): number => {
    for (let i = nodeStarts.length - 1; i >= 0; i--) {
      if (offset >= nodeStarts[i]) return i;
    }
    return 0;
  };

  // Strategy 1: Exact text match within a single section
  for (let i = 0; i < allNodes.length; i++) {
    if (nodeTexts[i].includes(normalizedSearch)) {
      console.log(`[ReferenceViewer] Strategy 1: Exact match in section "${allNodes[i].sectionNumber}"`);
      return { sectionNumber: allNodes[i].sectionNumber, matchType: 'exact' };
    }
  }
  
  // Strategy 2: Prefix + suffix matching (like getTextRange with long text > 255 chars)
  if (normalizedSearch.length > 50) {
    const prefix = normalizedSearch.slice(0, 50);
    const suffix = normalizedSearch.slice(-50);
    
    for (let i = 0; i < allNodes.length; i++) {
      const nodeText = nodeTexts[i];
      if (nodeText.includes(prefix) || nodeText.includes(suffix)) {
        console.log(`[ReferenceViewer] Strategy 2: Prefix/suffix match in section "${allNodes[i].sectionNumber}"`);
        return { sectionNumber: allNodes[i].sectionNumber, matchType: 'prefix-suffix' };
      }
    }
  }
  
  // Strategy 3: Cross-section search (like getTextRangeAcrossParagraphs)
  // Use regex with flexible whitespace matching
  const pattern = normalizedSearch.replace(/\s+/g, '\\s*');
  try {
    const regex = new RegExp(pattern, 'i');
    const match = regex.exec(combinedText);
    
    if (match) {
      const matchIndex = findNodeAtPosition(match.index);
      console.log(`[ReferenceViewer] Strategy 3: Cross-section match starting at section "${allNodes[matchIndex].sectionNumber}"`);
      return { sectionNumber: allNodes[matchIndex].sectionNumber, matchType: 'cross-section' };
    }
  } catch (e) {
    console.log('[ReferenceViewer] Regex search failed, trying fallback');
  }
  
  // Extract search words once for Strategy 4 and 5
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
  
  // Strategy 4: First N words match (like Word's truncated search fallback)
  if (searchWords.length >= 3) {
    const significantWords = searchWords.slice(0, Math.min(8, searchWords.length));
    const wordPattern = significantWords.join('\\s+');
    
    try {
      const regex = new RegExp(wordPattern, 'i');
      
      for (let i = 0; i < allNodes.length; i++) {
        if (regex.test(nodeTexts[i])) {
          console.log(`[ReferenceViewer] Strategy 4: Word pattern match in section "${allNodes[i].sectionNumber}"`);
          return { sectionNumber: allNodes[i].sectionNumber, matchType: 'word-pattern' };
        }
      }
      
      // Try in combined text
      const match = regex.exec(combinedText);
      if (match) {
        const matchIndex = findNodeAtPosition(match.index);
        console.log(`[ReferenceViewer] Strategy 4: Word pattern cross-section match in "${allNodes[matchIndex].sectionNumber}"`);
        return { sectionNumber: allNodes[matchIndex].sectionNumber, matchType: 'word-pattern-cross' };
      }
    } catch (e) {
      console.log('[ReferenceViewer] Word pattern search failed');
    }
  }
  
  // Strategy 5: Find longest matching word (ultimate fallback)
  const uniqueWords = Array.from(new Set(searchWords)).filter(w => w.length > 4).sort((a, b) => b.length - a.length);
  
  for (const word of uniqueWords.slice(0, 5)) {
    for (let i = 0; i < allNodes.length; i++) {
      if (nodeTexts[i].includes(word)) {
        console.log(`[ReferenceViewer] Strategy 5: Keyword "${word}" match in section "${allNodes[i].sectionNumber}"`);
        return { sectionNumber: allNodes[i].sectionNumber, matchType: 'keyword' };
      }
    }
  }
  
  console.warn(`[ReferenceViewer] No match found for: "${searchText.substring(0, 100)}..."`);
  console.log('[ReferenceViewer] Available sections:', allNodes.map(n => n.sectionNumber));
  return null;
};

export const ReferenceDocumentViewer: React.FC<ReferenceDocumentViewerProps> = ({
  structure,
  recitals,
  searchText,
}) => {
  const styles = useStyles();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const highlightedSectionRef = useRef<string | null>(null);

  // ============================================
  // Effect: Search and scroll when searchText changes
  // ============================================
  useEffect(() => {
    if (!searchText || !structure || structure.length === 0) {
      highlightedSectionRef.current = null;
      return;
    }
    
    console.log(`[ReferenceViewer] Searching for: "${searchText.substring(0, 100)}..."`);
    
    // Find the section using text search
    const result = findSectionByText(structure, searchText);
    
    if (result) {
      highlightedSectionRef.current = result.sectionNumber;
      
      // Scroll to the section
      const element = sectionRefs.current[result.sectionNumber];
      if (element) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          
          // Add temporary highlight effect (like Word's selection)
          element.style.boxShadow = '0 0 12px 3px #fbc02d';
          setTimeout(() => {
            element.style.boxShadow = '';
          }, 2000);
        }, 100);
        
        console.log(`[ReferenceViewer] Scrolled to section: "${result.sectionNumber}" (match type: ${result.matchType})`);
      } else {
        console.warn(`[ReferenceViewer] Section ref not found for: "${result.sectionNumber}"`);
      }
    } else {
      highlightedSectionRef.current = null;
    }
  }, [searchText, structure]);

  // ============================================
  // Determine if a section should be highlighted
  // ============================================
  const isSectionHighlighted = useCallback((nodeSectionNumber: string): boolean => {
    return highlightedSectionRef.current === nodeSectionNumber;
  }, []);

  // ============================================
  // Render a single section node
  // ============================================
  const renderSection = (node: DocumentNode) => {
    const isHighlighted = isSectionHighlighted(node.sectionNumber);
    
    // Determine heading style based on level
    let levelStyle = styles.sectionLevel1;
    if (node.level === 2) levelStyle = styles.sectionLevel2;
    if (node.level >= 3) levelStyle = styles.sectionLevel3;

    return (
      <div
        key={node.sectionNumber}
        ref={(el) => { sectionRefs.current[node.sectionNumber] = el; }}
        className={`${styles.section} ${isHighlighted ? styles.sectionHighlighted : ''}`}
      >
        {/* Section number and heading */}
        <div className={levelStyle}>
          <span className={styles.sectionNumber}>{node.sectionNumber}</span>
          <span className={styles.sectionText}>{node.text}</span>
        </div>

        {/* Additional paragraphs */}
        {node.additionalParagraphs && node.additionalParagraphs.length > 0 && (
          <div>
            {node.additionalParagraphs.map((para, index) => (
              <p key={index} className={styles.additionalParagraph}>
                {para}
              </p>
            ))}
          </div>
        )}

        {/* Recursively render children */}
        {node.children && node.children.length > 0 && (
          <div style={{ marginLeft: "20px" }}>
            {node.children.map((child) => renderSection(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.viewerRoot}>
      {/* Recitals section */}
      {recitals && (
        <div className={styles.recitals}>
          <div className={styles.recitalsTitle}>Recitals</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{recitals}</div>
        </div>
      )}

      {/* Document structure */}
      {structure.map((node) => renderSection(node))}
    </div>
  );
};