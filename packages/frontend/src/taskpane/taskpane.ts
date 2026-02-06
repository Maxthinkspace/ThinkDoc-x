/* global Word console Office */
import JSZip from "jszip";

export async function insertText(text: string) {
  // Write text to the document.
  try {
    await Word.run(async (context) => {
      let body = context.document.body;
      body.insertParagraph(text, Word.InsertLocation.end);
      await context.sync();
    });
  } catch (error) {
    console.log("Error: " + error);
  }
}

async function getParagraphTextsForRangesOOXML(hitTexts: string[]): Promise<string[]> {
  try {
    if (hitTexts.length === 0) return [];
    const pkg = await getCompressedDocumentPackage();
    const zip = await JSZip.loadAsync(pkg);
    const main = zip.file("word/document.xml");
    if (!main) return hitTexts.map(() => "");
    const xml = await main.async("string");
    const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const dom = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphs = dom.getElementsByTagNameNS(wNs, "p");
    const paraTexts: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs.item(i)!;
      let text = "";
      const ts = p.getElementsByTagNameNS(wNs, "t");
      for (let j = 0; j < ts.length; j++) text += ts.item(j)!.textContent || "";
      paraTexts.push(text);
    }
    // For each hit text, find the first paragraph that contains it
    return hitTexts.map((hit) => {
      const h = (hit || "").trim();
      if (!h) return "";
      const found = paraTexts.find((pt) => pt.includes(h));
      return (found || "").trim();
    });
  } catch {
    return hitTexts.map(() => "");
  }
}

function getCompressedDocumentPackage(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(Office.FileType.Compressed, (res) => {
      if (res.status !== Office.AsyncResultStatus.Succeeded) {
        reject(res.error);
        return;
      }
      const file = res.value;
      const sliceCount = file.sliceCount;
      const slices: Uint8Array[] = [];
      let next = 0;
      const readNext = () => {
        file.getSliceAsync(next, (sr) => {
          if (sr.status !== Office.AsyncResultStatus.Succeeded) {
            file.closeAsync();
            reject(sr.error);
            return;
          }
          slices.push(new Uint8Array(sr.value.data as ArrayBuffer));
          next++;
          if (next < sliceCount) {
            readNext();
          } else {
            file.closeAsync();
            const total = slices.reduce((s, a) => s + a.byteLength, 0);
            const all = new Uint8Array(total);
            let off = 0;
            for (const a of slices) {
              all.set(a, off);
              off += a.byteLength;
            }
            resolve(all.buffer);
          }
        });
      };
      readNext();
    });
  });
}

export async function getContent() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text;
  });
}

export type TrackChangeItem = {
  index: number;
  kind: "insert" | "delete";
  text: string;
  originalText?: string;
  author?: string;
  date?: string;
  part?: string;
  paragraph: string;
  surroundingContext?: {
    before: string;
    after: string;
  };
  positionInParagraph?: number;
  locationText?: string; // Best text to use for location (for deletions, this might be surrounding context)
};

export type ParagraphChange = {
  type: "insert" | "delete";
  text: string;
  position: number;
  author?: string;
  date?: string;
  id?: string;
};

export type ParagraphDiff = {
  paragraphId: string;
  originalText: string; // Text with deletions, without insertions
  currentText: string; // Text without deletions, with insertions
  changes: ParagraphChange[];
  diffHtml: string; // HTML representation of the diff
  hasChanges: boolean;
  part?: string; // Which document part this came from
};

/*export type DiffSegment = {
  type: "unchanged" | "inserted" | "deleted";
  text: string;
  position: number;
};*/

export type TrackChangesResult = {
  paragraphDiffs: ParagraphDiff[];
  individualChanges: TrackChangeItem[]; // For backward compatibility
  totalChanges: number;
};

export type DiffChange = {
  type: "insert" | "delete" | "unchanged";
  text: string;
  position: number;
  length: number;
};

export type ParagraphDiffProposal = {
  originalText: string;
  modifiedText: string;
  changes: DiffChange[];
  previewHtml: string;
  isValid: boolean;
  hasChanges: boolean;
};

/**
 * Calculate text differences between original and modified text using LCS algorithm
 * This prevents cascading errors with multi-word replacements like "shall" -> "have to"
 * @param originalText The original text
 * @param modifiedText The modified text
 * @returns Array of DiffChange objects representing the differences
 */
function calculateTextDiff(originalText: string, modifiedText:
  string): DiffChange[] {
  // Split into words while preserving whitespace
  const originalWords = originalText.match(/\w+|[^\w]|\s+/g) || [];
  const modifiedWords = modifiedText.match(/\w+|[^\w]|\s+/g) || [];

  // Use LCS to find optimal alignment
  const lcs = calculateDP(originalWords, modifiedWords);

  // Extract changes from the LCS alignment
  const changes = extractChangesFromLCS(originalWords, modifiedWords, lcs);

  return changes;
}
 /**
* Calculate Edit Distance between two word arrays
* @param originalWords Array of words from original text
* @param modifiedWords Array of words from modified text
* @returns edit distance information
*/
function calculateDP(originalWords: string[], modifiedWords: string[]): LCSResult {
  const m = originalWords.length;
  const n = modifiedWords.length;
 
  // Create LCS table
  const dpTable: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
 
  for (let i = 0; i <= m; i++) {
    dpTable[i][0] = i; 
  }
  for (let j = 0; j <= n; j++) {
    dpTable[0][j] = j; 
  }
 
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalWords[i - 1] === modifiedWords[j - 1]) {
        dpTable[i][j] = dpTable[i - 1][j - 1];
      } else {
        dpTable[i][j] = Math.min(
                    dpTable[i - 1][j] + 1,      // Deletion
                    dpTable[i][j - 1] + 1       // Insertion                
                    );
      }
    }
  }
 
  // Backtrack to build alignment
  const alignment: Array<{
    original: number;
    modified: number;
    type: "match" | "delete" | "insert";
  }> = [];
  let i = m;
  let j = n;
 
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalWords[i - 1] === modifiedWords[j - 1]) {
      // Match
      alignment.unshift({ original: i - 1, modified: j - 1, type: "match" });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dpTable[i][j] === dpTable[i - 1][j] + 1)) {
      // Deletion
      alignment.unshift({ original: i - 1, modified: -1, type: "delete" });
      i--;
    } else if (j > 0 && (i === 0 || dpTable[i][j] === dpTable[i][j - 1] + 1)) {
      // Insertion
      alignment.unshift({ original: -1, modified: j - 1, type: "insert" });
      j--;
    } else {
      console.error("Diff backtracking failed at:", i, j);
      break;
    }
  }
 
  return {
    table: dpTable,
    alignment,
    originalWords,
    modifiedWords,
  };
}
/**
* Extract diff changes from LCS alignment with optimization for grouped changes
* @param originalWords Original word array
* @param modifiedWords Modified word array
* @param lcs LCS calculation result
* @returns Array of DiffChange objects
*/
function extractChangesFromLCS(
  originalWords: string[],
  modifiedWords: string[],
  lcs: LCSResult
): DiffChange[] {
  const changes: DiffChange[] = [];
  let position = 0;
  // Group consecutive insertions and deletions for better readability
  let pendingDeletes: string[] = [];
  let pendingInserts: string[] = [];
 
  const flushPendingChanges = () => {
    // Add all pending deletions first
    if (pendingDeletes.length > 0) {
      const deleteText = pendingDeletes.join("");
      changes.push({
        type: "delete",
        text: deleteText,
        position,
        length: deleteText.length,
      });
      pendingDeletes = [];
    }
 
    // Then add all pending insertions
    if (pendingInserts.length > 0) {
      const insertText = pendingInserts.join("");
      changes.push({
        type: "insert",
        text: insertText,
        position,
        length: insertText.length,
      });
      position += insertText.length;
      pendingInserts = [];
    }
  };
 
  for (const item of lcs.alignment) {
    if (item.type === "match") {
      // Flush any pending changes before adding unchanged text
      flushPendingChanges();
 
      // Unchanged text
      const text = originalWords[item.original];
      changes.push({
        type: "unchanged",
        text,
        position,
        length: text.length,
      });
      position += text.length;
    } else if (item.type === "delete") {
      // Collect deleted text
      pendingDeletes.push(originalWords[item.original]);
    } else if (item.type === "insert") {
      // Collect inserted text
      pendingInserts.push(modifiedWords[item.modified]);
    }
  }
 
  // Flush any remaining pending changes
  flushPendingChanges();
 
  // Traverse all changes to fix deletion and insertion positions
  // let changeItem:DiffChange;
  //   position = 0;
  //   for (changeItem of changes) {
  //     changeItem.position = position;
  //     position += changeItem.length;
  //   }
 
  return changes;
}
/**
 * LCS calculation result structure
 */
type LCSResult = {
  table: number[][];
  alignment: Array<{ original: number; modified: number; type: "match" | "delete" | "insert" }>;
  originalWords: string[];
  modifiedWords: string[];
};
/**
 * Create a paragraph diff proposal from before and after text
 * @param originalText The original paragraph text
 * @param modifiedText The modified paragraph text
 * @returns ParagraphDiffProposal object
 */
export function createParagraphDiffProposal(
  originalText: string,
  modifiedText: string
): ParagraphDiffProposal {
  const debug_mode = false;

  // Normalize the text inputs
  const normalizedOriginal = originalText.trim();
  const normalizedModified = modifiedText.trim();

  // Calculate differences
  const changes = calculateTextDiff(normalizedOriginal, normalizedModified);

  // Generate preview HTML
  const previewHtml = createDiffProposalHtml(changes);

  // Check if there are actual changes
  const hasChanges = changes.some((change) => change.type !== "unchanged");

  // Validate the proposal
  const isValid = normalizedOriginal.length > 0 && normalizedModified.length > 0 && hasChanges;

  if (debug_mode) {
    console.log(consolidateChanges(changes));
  }

  return {
    originalText: normalizedOriginal,
    modifiedText: normalizedModified,
    changes,
    previewHtml,
    isValid,
    hasChanges,
  };
}

/**
 * Create HTML representation of diff proposal
 * @param changes Array of DiffChange objects
 * @returns HTML string with styled diff
 */
function createDiffProposalHtml(changes: DiffChange[]): string {
  return changes
    .map((change) => {
      const escapedText = change.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        
        // ==============================================================================================================================
        // NOTE 11-27-2025:
        // Added <br> to fix the problem that when inserting multiple sections, the diff box shows all the new sections in a single block
        // ==============================================================================================================================

        .replace(/\n/g, "<br>");  

      switch (change.type) {
        case "insert":
          return `<span class="diff-inserted">${escapedText}</span>`;
        case "delete":
          return `<span class="diff-deleted">${escapedText}</span>`;
        case "unchanged":
        default:
          return escapedText;
      }
    })
    .join("");
}

/**
 * Generate HTML diff view from two paragraphs of text
 * This is a reusable function for UI components to display track changes
 * @param beforeText The original paragraph text
 * @param afterText The modified paragraph text
 * @param options Optional configuration for styling
 * @returns HTML string with track changes styling that can be inserted into UI components
 *
 * @example
 * ```typescript
 * const diffHtml = generateDiffHtml("Hello world", "Hello beautiful world");
 * // Returns: 'Hello <span class="diff-inserted">beautiful </span>world'
 *
 * // Usage in React component:
 * <div dangerouslySetInnerHTML={{ __html: diffHtml }} />
 * ```
 */
export function generateDiffHtml(
  beforeText: string,
  afterText: string,
  options: {
    /** CSS class name for inserted text (default: 'diff-inserted') */
    insertedClass?: string;
    /** CSS class name for deleted text (default: 'diff-deleted') */
    deletedClass?: string;
    /** Whether to include inline CSS styles (default: false) */
    includeInlineStyles?: boolean;
  } = {}
): string {
  const {
    insertedClass = "diff-inserted",
    deletedClass = "diff-deleted",
    includeInlineStyles = false,
  } = options;

  // Handle empty inputs
  if (!beforeText.trim() && !afterText.trim()) {
    return "";
  }
  if (!beforeText.trim()) {
    const escapedAfter = afterText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const style = includeInlineStyles
      ? ' style="background-color: #d4edda; color: #155724; font-weight: bold; padding: 1px 2px; border-radius: 2px;"'
      : "";
    return `<span class="${insertedClass}"${style}>${escapedAfter}</span>`;
  }
  if (!afterText.trim()) {
    const escapedBefore = beforeText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const style = includeInlineStyles
      ? ' style="background-color: #f8d7da; color: #721c24; text-decoration: line-through; padding: 1px 2px; border-radius: 2px;"'
      : "";
    return `<span class="${deletedClass}"${style}>${escapedBefore}</span>`;
  }

  // Use the existing LCS-based diff algorithm
  const changes = calculateTextDiff(beforeText, afterText);

  // Generate HTML with custom class names and optional inline styles
  return changes
    .map((change) => {
      const escapedText = change.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

        // ==============================================================================================================================
        // NOTE 11-27-2025:
        // Added <br> to fix the problem that when inserting multiple sections, the diff box shows all the new sections in a single block
        // ==============================================================================================================================

        .replace(/\n/g, "<br>");  

      switch (change.type) {
        case "insert":
          const insertStyle = includeInlineStyles
            ? ' style="background-color: #d4edda; color: #155724; font-weight: bold; padding: 1px 2px; border-radius: 2px;"'
            : "";
          return `<span class="${insertedClass}"${insertStyle}>${escapedText}</span>`;
        case "delete":
          const deleteStyle = includeInlineStyles
            ? ' style="background-color: #f8d7da; color: #721c24; text-decoration: line-through; padding: 1px 2px; border-radius: 2px;"'
            : "";
          return `<span class="${deletedClass}"${deleteStyle}>${escapedText}</span>`;
        case "unchanged":
        default:
          return escapedText;
      }
    })
    .join("");
}

/**
 * Generate CSS styles for diff HTML output
 * Use this to include the necessary styles in your component or global CSS
 * @returns CSS string that can be injected into style tags
 */
export function getDiffStyles(): string {
  return `
    .diff-inserted {
      background-color: #d4edda !important;
      color: #155724 !important;
      padding: 1px 2px !important;
      border-radius: 2px !important;
      font-weight: bold !important;
      text-decoration: none !important;
    }
    .diff-deleted {
      background-color: #f8d7da !important;
      color: #721c24 !important;
      padding: 1px 2px !important;
      border-radius: 2px !important;
      text-decoration: line-through !important;
    }
  `;
}

/**
 * Create enhanced diff HTML that properly shows positioning
 * @param textSegments Array of text segments with their types and positions
 * @returns HTML string with proper diff visualization
 */
function createEnhancedDiffHtml(
  textSegments: Array<{
    type: "normal" | "insert" | "delete";
    text: string;
    position: number;
    metadata?: any;
    docOrder: number;
  }>
): string {
  return textSegments
    .map((segment) => {
      const escapedText = segment.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      switch (segment.type) {
        case "insert":
          return `<span class="diff-inserted">${escapedText}</span>`;
        case "delete":
          return `<span class="diff-deleted">${escapedText}</span>`;
        case "normal":
        default:
          return escapedText;
      }
    })
    .join("");
}

/**
 * Extract text content from an element, handling w:t elements properly
 * @param element Element to extract text from
 * @param wNs Word namespace
 * @returns Extracted text
 */
function extractTextContent(element: Element, wNs: string): string {
  let text = "";
  const textElements = element.getElementsByTagNameNS(wNs, "t");

  if (textElements.length > 0) {
    for (let i = 0; i < textElements.length; i++) {
      text += textElements.item(i)!.textContent || "";
    }
  } else {
    // Fallback to direct text content
    text = element.textContent || "";
  }

  return text;
}

export async function addComment(commentText: string): Promise<boolean> {
  try {
    const result = await Word.run(async (context) => {
      // Get the current selection
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();

      if (!selection.text || selection.text.trim() === "") {
        throw new Error("Please select some text to comment on");
      }

      // Try to add comment using the Office.js API
      try {
        // Method 1: Try using the selection's getComments method
        const comment: Word.Comment = context.document.getSelection().insertComment(commentText);
        comment.load();
        await context.sync();
        return true;
      } catch (apiError) {
        console.log("Direct API method failed, trying alternative approach:", apiError);
      }

      // Method 2: Try using the body's getComments method
      try {
        const body = context.document.body;
        const bodyComments = body.getComments();
        if (bodyComments && typeof (bodyComments as any).add === "function") {
          (bodyComments as any).add(commentText);
          await context.sync();
          return true;
        }
      } catch (bodyError) {
        console.log("Body comments method failed:", bodyError);
      }

      // Method 3: Fallback - insert comment marker
      const commentMarker = `[COMMENT: ${commentText}]`;
      selection.insertText(commentMarker, "Replace");
      await context.sync();
      return false; // Indicates we used fallback method
    });
    return result;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

export async function addHighlight(highlightColor: string): Promise<boolean> {
  try {
    const result = await Word.run(async (context) => {
      // Get the current selection
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();

      if (!selection.text || selection.text.trim() === "") {
        throw new Error("Please select some text to highlight");
      }

      // Apply highlighting to the selected text
      selection.font.highlightColor = highlightColor;
      await context.sync();

      return true;
    });
    return result;
  } catch (error) {
    console.error("Error adding highlight:", error);
    throw error;
  }
}
/**
 * Locate and scroll to specific text content in the document
 * @param searchText The text to search for
 * @param options Search options for better matching
 * @returns Promise<boolean> indicating if the text was found and scrolled to
 */
export async function locateAndScrollToText(
  searchText: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    selectText?: boolean;
  } = {}
): Promise<boolean> {
  if (!searchText || searchText.trim().length === 0) return false;

  const {
    matchCase = false,
    matchWholeWord = false,
    ignorePunct = true,
    ignoreSpace = true,
    selectText = true,
  } = options;

  try {
    return await Word.run(async (context) => {
      const body = context.document.body;

      // Clean and validate the search text
      let cleanSearchText = searchText.trim();

      // If search text is too long, truncate it
      if (cleanSearchText.length > 100) {
        cleanSearchText = cleanSearchText.substring(0, 100);
        console.log(`Search text truncated to: "${cleanSearchText}"`);
      }

      // Clean the search text of problematic characters
      cleanSearchText = cleanSearchText
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanSearchText.length === 0) {
        console.log("No valid search text available");
        return false;
      }

      try {
        // Search for the text
        const ranges = body.search(cleanSearchText, {
          matchCase,
          matchWholeWord,
          ignorePunct,
          ignoreSpace,
        });

        ranges.load("items");
        await context.sync();

        if (ranges.items.length === 0) {
          console.log(`Text "${cleanSearchText}" not found in document`);
          return false;
        }

        // Get the first occurrence
        const firstRange = ranges.items[0];

        if (selectText) {
          // Select the text to highlight it
          firstRange.select("Select");
        } else {
          // Just scroll to the text without selecting
          firstRange.select("Start");
        }

        await context.sync();
        console.log(`Successfully located and scrolled to: "${cleanSearchText}"`);
        return true;
      } catch (searchError) {
        console.log("Text search failed, trying fallback strategy:", searchError);

        // Fallback: try to find any part of the text
        const words = cleanSearchText
          .split(/\s+/)
          .filter((word) => word.length > 3 && word.length <= 50);
        if (words.length > 0) {
          // Try to find the longest word
          const searchWord = words.reduce((longest, current) =>
            current.length > longest.length ? current : longest
          );

          try {
            const wordRanges = body.search(searchWord, {
              matchCase: false,
              matchWholeWord: true,
              ignorePunct: false,
              ignoreSpace: false,
            });

            wordRanges.load("items");
            await context.sync();

            if (wordRanges.items.length > 0) {
              wordRanges.items[0].select("Select");
              console.log(`Fallback: located word "${searchWord}" from search text`);
              return true;
            }
          } catch (wordError) {
            console.log("Word search fallback also failed:", wordError);
          }
        }

        return false;
      }
    });
  } catch (error) {
    console.error("Error locating text:", error);
    return false;
  }
}

/**
 * Locate content by paragraph text - more targeted than full document search
 * @param paragraphText The paragraph text to locate
 * @param targetText Optional specific text to highlight within the paragraph
 * @param options Search options
 * @returns Promise<boolean> indicating if location was successful
 */
export async function locateByParagraph(
  paragraphText: string,
  targetText?: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    highlightTarget?: boolean;
  } = {}
): Promise<boolean> {
  if (!paragraphText || paragraphText.trim().length === 0) return false;

  const {
    matchCase = false,
    matchWholeWord = false,
    ignorePunct = true,
    ignoreSpace = true,
    highlightTarget = false,
  } = options;

  try {
    return await Word.run(async (context) => {
      const body = context.document.body;

      // Clean and validate the paragraph text
      let cleanParagraphText = paragraphText.trim();

      // If paragraph text is too long, truncate it intelligently
      if (cleanParagraphText.length > 150) {
        // Try to find a good breaking point (sentence end, then word boundary)
        const sentenceEnd = cleanParagraphText.search(/[.!?]\s/);
        if (sentenceEnd > 0 && sentenceEnd < 150) {
          cleanParagraphText = cleanParagraphText.substring(0, sentenceEnd + 1);
        } else {
          // Find last word boundary before 150 chars
          const lastSpace = cleanParagraphText.lastIndexOf(" ", 150);
          if (lastSpace > 100) {
            cleanParagraphText = cleanParagraphText.substring(0, lastSpace);
          } else {
            cleanParagraphText = cleanParagraphText.substring(0, 150);
          }
        }
        console.log(`Paragraph text truncated to: "${cleanParagraphText}"`);
      }

      // Clean the paragraph text of problematic characters
      cleanParagraphText = cleanParagraphText
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanParagraphText.length === 0) {
        return false;
      }

      // Search for the paragraph text
      const paragraphRanges = body.search(cleanParagraphText, {
        matchCase,
        matchWholeWord: false, // Don't require whole word match for paragraphs
        ignorePunct,
        ignoreSpace,
      });

      paragraphRanges.load("items");
      await context.sync();

      if (paragraphRanges.items.length === 0) {
        console.log(`Paragraph not found: "${cleanParagraphText.substring(0, 50)}..."`);
        return false;
      }

      // Select the first paragraph match
      const paragraphRange = paragraphRanges.items[0];
      paragraphRange.select("Select");
      await context.sync();

      console.log(`Located paragraph: "${cleanParagraphText.substring(0, 50)}..."`);

      // If target text is specified, try to highlight it within the paragraph
      if (targetText && targetText.trim() && highlightTarget) {
        try {
          // Search for target text within the paragraph range
          const targetRanges = paragraphRange.search(targetText.trim(), {
            matchCase,
            matchWholeWord,
            ignorePunct,
            ignoreSpace,
          });

          targetRanges.load("items");
          await context.sync();

          if (targetRanges.items.length > 0) {
            // Highlight the target text
            targetRanges.items.forEach((range) => {
              range.font.highlightColor = "Yellow";
            });
            await context.sync();
            console.log(`Highlighted target text: "${targetText}"`);
          }
        } catch (highlightError) {
          console.log("Target highlighting failed:", highlightError);
        }
      }

      return true;
    });
  } catch (error) {
    console.error("Error locating by paragraph:", error);
    return false;
  }
}

/**
 * Locate content by paragraph with fallback strategies
 * @param paragraphText The paragraph text to locate
 * @param targetText Optional specific text to highlight within the paragraph
 * @param options Search options
 * @returns Promise<boolean> indicating if location was successful
 */
export async function locateByParagraphWithFallback(
  paragraphText: string,
  targetText?: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    highlightTarget?: boolean;
  } = {}
): Promise<boolean> {
  // Strategy 1: Try with full paragraph text
  try {
    const success = await locateByParagraph(paragraphText, targetText, options);
    if (success) return true;
  } catch (error) {
    console.log("Full paragraph search failed, trying fallback strategies:", error);
  }

  // Strategy 2: Try with truncated paragraph (first 100 chars)
  try {
    const truncatedParagraph = paragraphText.substring(0, 100).trim();
    if (truncatedParagraph.length > 20) {
      const success = await locateByParagraph(truncatedParagraph, targetText, options);
      if (success) return true;
    }
  } catch (error) {
    console.log("Truncated paragraph search failed:", error);
  }

  // Strategy 3: Try with first sentence
  try {
    const firstSentence = paragraphText.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 10) {
      const success = await locateByParagraph(firstSentence, targetText, options);
      if (success) return true;
    }
  } catch (error) {
    console.log("First sentence search failed:", error);
  }

  // Strategy 4: Try with target text only if it exists
  if (targetText && targetText.trim().length > 3) {
    try {
      const success = await locateAndScrollToText(targetText.trim(), options);
      if (success) return true;
    } catch (error) {
      console.log("Target text search failed:", error);
    }
  }

  // Strategy 5: Try to find the longest meaningful words in the paragraph
  try {
    const words = paragraphText
      .split(/\s+/)
      .filter((word) => word.length > 4 && word.length < 30) // Reasonable word length
      .sort((a, b) => b.length - a.length) // Sort by length, longest first
      .slice(0, 3); // Take top 3 longest words

    for (const word of words) {
      try {
        const success = await locateAndScrollToText(word, {
          ...options,
          matchWholeWord: true,
        });
        if (success) {
          console.log(`Located using key word: "${word}"`);
          return true;
        }
      } catch (error) {
        console.log(`Failed to locate using word "${word}":`, error);
      }
    }
  } catch (error) {
    console.log("Key word search strategy failed:", error);
  }

  console.log("All paragraph location strategies failed");
  return false;
}

/**
 * Locate and scroll to content by multiple criteria (most flexible)
 * @param criteria Object containing search criteria
 * @returns Promise<boolean> indicating if the content was found and scrolled to
 */
/* export async function locateAndScrollToContent(criteria: {
  text?: string;
  paragraph?: string;
  author?: string;
  date?: string;
  type?: string;
}): Promise<boolean> {
  const { text, paragraph, author, date, type } = criteria;

  // Priority: text > paragraph > other criteria
  if (text && text.trim()) {
    return await locateAndScrollToText(text, { selectText: true });
  }

  if (paragraph && paragraph.trim()) {
    return await locateAndScrollToParagraph(paragraph, text);
  }

  // If we only have author/date/type, we need to search more broadly
  // This would require additional implementation to search through metadata
  console.log("Insufficient criteria for location. Need text or paragraph content.");
  return false;
}*/
/**
 * Utility function to sanitize text for Word search operations
 * @param text The text to sanitize
 * @param maxLength Maximum length for the search text
 * @returns Sanitized text suitable for Word search
 */
/*function sanitizeTextForSearch(text: string, maxLength: number = 100): string {
  if (!text || text.trim().length === 0) return "";

  let sanitized = text.trim();

  // Remove problematic characters
  sanitized = sanitized.replace(/[\r\n\t]/g, " ");

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ");

  // Truncate if too long
  if (sanitized.length > maxLength) {
    // Try to find a good breaking point
    const truncated = sanitized.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastPeriod > maxLength * 0.5) {
      sanitized = truncated.substring(0, lastPeriod + 1);
    } else if (lastSpace > maxLength * 0.5) {
      sanitized = truncated.substring(0, lastSpace);
    } else {
      sanitized = truncated;
    }
  }

  return sanitized.trim();
}*/
/**
 * Search for text in Word document with multiple results support
 * @param searchText The text to search for
 * @param options Search options
 * @returns Promise with search results and navigation functions
 */
export async function searchWordContent(
  searchText: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    highlightResults?: boolean;
  } = {}
): Promise<{
  results: Array<{
    index: number;
    text: string;
    range: Word.Range;
    paragraph: string;
  }>;
  totalCount: number;
  navigateToResult: (index: number) => Promise<boolean>;
  navigateNext: () => Promise<boolean>;
  navigatePrevious: () => Promise<boolean>;
  clearHighlights: () => Promise<void>;
}> {
  if (!searchText || searchText.trim().length === 0) {
    return {
      results: [],
      totalCount: 0,
      navigateToResult: async () => false,
      navigateNext: async () => false,
      navigatePrevious: async () => false,
      clearHighlights: async () => {},
    };
  }

  const {
    matchCase = false,
    matchWholeWord = false,
    ignorePunct = true,
    ignoreSpace = true,
    highlightResults = true,
  } = options;

  try {
    return await Word.run(async (context) => {
      const body = context.document.body;

      // Clean and validate the search text
      let cleanSearchText = searchText.trim();

      // If search text is too long, truncate it
      if (cleanSearchText.length > 100) {
        cleanSearchText = cleanSearchText.substring(0, 100);
        console.log(`Search text truncated to: "${cleanSearchText}"`);
      }

      // Clean the search text of problematic characters
      cleanSearchText = cleanSearchText
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanSearchText.length === 0) {
        throw new Error("No valid search text available");
      }

      // Search for the text
      const ranges = body.search(cleanSearchText, {
        matchCase,
        matchWholeWord,
        ignorePunct,
        ignoreSpace,
      });

      ranges.load("items/text");
      await context.sync();

      if (ranges.items.length === 0) {
        console.log(`Text "${cleanSearchText}" not found in document`);
        return {
          results: [],
          totalCount: 0,
          navigateToResult: async () => false,
          navigateNext: async () => false,
          navigatePrevious: async () => false,
          clearHighlights: async () => {},
        };
      }

      // Get paragraph text for each result
      const paragraphTexts = await getParagraphTextsForRangesOOXML(ranges.items.map((r) => r.text));
      await context.sync();

      // Build results array with range information
      const results = ranges.items.map((range, index) => ({
        index,
        text: range.text,
        range,
        paragraph: paragraphTexts[index] || "",
      }));

      // Highlight results if requested
      if (highlightResults) {
        try {
          ranges.items.forEach((range) => {
            range.font.highlightColor = "Yellow";
          });
          await context.sync();
        } catch (highlightError) {
          console.log("Highlighting failed, continuing without highlights:", highlightError);
        }
      }

      let currentIndex = -1;

      // Navigation functions with proper range handling
      const navigateToResult = async (index: number): Promise<boolean> => {
        if (index < 0 || index >= results.length) return false;

        try {
          // Create a fresh context for navigation to avoid stale ranges
          return await Word.run(async (navContext) => {
            const body = navContext.document.body;

            // Re-search for the text to get fresh ranges
            const freshRanges = body.search(cleanSearchText, {
              matchCase,
              matchWholeWord,
              ignorePunct,
              ignoreSpace,
            });

            freshRanges.load("items");
            await navContext.sync();

            if (index < freshRanges.items.length) {
              const targetRange = freshRanges.items[index];

              // Select the range
              targetRange.select("Select");
              await navContext.sync();

              currentIndex = index;
              console.log(`Navigated to result ${index + 1} of ${results.length}`);
              return true;
            }

            return false;
          });
        } catch (error) {
          console.error("Error navigating to result:", error);
          return false;
        }
      };

      const navigateNext = async (): Promise<boolean> => {
        const nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
        return await navigateToResult(nextIndex);
      };

      const navigatePrevious = async (): Promise<boolean> => {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
        return await navigateToResult(prevIndex);
      };

      const clearHighlights = async (): Promise<void> => {
        try {
          // Create a fresh context for clearing highlights
          await Word.run(async (clearContext) => {
            const body = clearContext.document.body;

            // Re-search for the text to get fresh ranges
            const freshRanges = body.search(cleanSearchText, {
              matchCase,
              matchWholeWord,
              ignorePunct,
              ignoreSpace,
            });

            freshRanges.load("items");
            await clearContext.sync();

            // Clear highlights
            freshRanges.items.forEach((range) => {
              range.font.highlightColor = "white";
            });

            await clearContext.sync();
            console.log("Cleared all search result highlights");
          });
        } catch (error) {
          console.error("Error clearing highlights:", error);
        }
      };

      console.log(`Found ${results.length} results for: "${cleanSearchText}"`);

      return {
        results,
        totalCount: results.length,
        navigateToResult,
        navigateNext,
        navigatePrevious,
        clearHighlights,
      };
    });
  } catch (error) {
    console.error("Error searching Word content:", error);
    throw error;
  }
}

/**
 * Quick search and navigate to first result
 * @param searchText The text to search for
 * @returns Promise<boolean> indicating if text was found and navigated to
 */
export async function quickSearchAndNavigate(searchText: string): Promise<boolean> {
  try {
    const searchResult = await searchWordContent(searchText, { highlightResults: true });

    if (searchResult.totalCount > 0) {
      // Navigate to first result
      const success = await searchResult.navigateToResult(0);
      if (success) {
        console.log(`Quick search successful: found ${searchResult.totalCount} results`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Quick search failed:", error);
    return false;
  }
}

/**
 * Robust search function that handles range issues better
 * @param searchText The text to search for
 * @param options Search options
 * @returns Promise with search results and navigation functions
 */
export async function robustSearchWordContent(
  searchText: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    highlightResults?: boolean;
  } = {}
): Promise<{
  results: Array<{
    index: number;
    text: string;
    paragraph: string;
  }>;
  totalCount: number;
  navigateToResult: (index: number) => Promise<boolean>;
  navigateNext: () => Promise<boolean>;
  navigatePrevious: () => Promise<boolean>;
  clearHighlights: () => Promise<void>;
}> {
  if (!searchText || searchText.trim().length === 0) {
    return {
      results: [],
      totalCount: 0,
      navigateToResult: async () => false,
      navigateNext: async () => false,
      navigatePrevious: async () => false,
      clearHighlights: async () => {},
    };
  }

  const {
    matchCase = false,
    matchWholeWord = false,
    ignorePunct = true,
    ignoreSpace = true,
    highlightResults = true,
  } = options;

  try {
    return await Word.run(async (context) => {
      const body = context.document.body;

      // Clean and validate the search text
      let cleanSearchText = searchText.trim();

      // If search text is too long, truncate it
      if (cleanSearchText.length > 100) {
        cleanSearchText = cleanSearchText.substring(0, 100);
        console.log(`Search text truncated to: "${cleanSearchText}"`);
      }

      // Clean the search text of problematic characters
      cleanSearchText = cleanSearchText
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanSearchText.length === 0) {
        throw new Error("No valid search text available");
      }

      // Search for the text
      const ranges = body.search(cleanSearchText, {
        matchCase,
        matchWholeWord,
        ignorePunct,
        ignoreSpace,
      });

      ranges.load("items/text");
      await context.sync();

      if (ranges.items.length === 0) {
        console.log(`Text "${cleanSearchText}" not found in document`);
        return {
          results: [],
          totalCount: 0,
          navigateToResult: async () => false,
          navigateNext: async () => false,
          navigatePrevious: async () => false,
          clearHighlights: async () => {},
        };
      }

      // Get paragraph text for each result
      const paragraphTexts = await getParagraphTextsForRangesOOXML(ranges.items.map((r) => r.text));
      await context.sync();

      // Build results array (without storing ranges to avoid stale range issues)
      const results = ranges.items.map((range, index) => ({
        index,
        text: range.text,
        paragraph: paragraphTexts[index] || "",
      }));

      // Highlight results if requested
      if (highlightResults) {
        try {
          ranges.items.forEach((range) => {
            range.font.highlightColor = "Yellow";
          });
          await context.sync();
        } catch (highlightError) {
          console.log("Highlighting failed, continuing without highlights:", highlightError);
        }
      }

      let currentIndex = -1;

      // Navigation functions that re-search each time to avoid stale ranges
      const navigateToResult = async (index: number): Promise<boolean> => {
        if (index < 0 || index >= results.length) return false;

        try {
          // Always re-search to get fresh ranges
          return await Word.run(async (navContext) => {
            const body = navContext.document.body;

            const freshRanges = body.search(cleanSearchText, {
              matchCase,
              matchWholeWord,
              ignorePunct,
              ignoreSpace,
            });

            freshRanges.load("items");
            await navContext.sync();

            if (index < freshRanges.items.length) {
              const targetRange = freshRanges.items[index];

              // Select the range
              targetRange.select("Select");
              await navContext.sync();

              currentIndex = index;
              console.log(`Navigated to result ${index + 1} of ${results.length}`);
              return true;
            }

            return false;
          });
        } catch (error) {
          console.error("Error navigating to result:", error);
          return false;
        }
      };

      const navigateNext = async (): Promise<boolean> => {
        const nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
        return await navigateToResult(nextIndex);
      };

      const navigatePrevious = async (): Promise<boolean> => {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
        return await navigateToResult(prevIndex);
      };

      const clearHighlights = async (): Promise<void> => {
        try {
          // Always re-search to get fresh ranges
          await Word.run(async (clearContext) => {
            const body = clearContext.document.body;

            const freshRanges = body.search(cleanSearchText, {
              matchCase,
              matchWholeWord,
              ignorePunct,
              ignoreSpace,
            });

            freshRanges.load("items");
            await clearContext.sync();

            // Clear highlights
            freshRanges.items.forEach((range) => {
              range.font.highlightColor = "white";
            });

            await clearContext.sync();
            console.log("Cleared all search result highlights");
          });
        } catch (error) {
          console.error("Error clearing highlights:", error);
        }
      };

      console.log(`Found ${results.length} results for: "${cleanSearchText}"`);

      return {
        results,
        totalCount: results.length,
        navigateToResult,
        navigateNext,
        navigatePrevious,
        clearHighlights,
      };
    });
  } catch (error) {
    console.error("Error searching Word content:", error);
    throw error;
  }
}

/**
 * Locate and scroll to a paragraph diff using the current (visible) text
 * @param paragraphDiff The paragraph diff to locate
 * @returns Promise<boolean> indicating if the paragraph was located
 */
export async function locateParagraphDiff(paragraphDiff: ParagraphDiff): Promise<boolean> {
  console.log(`Attempting to locate paragraph with ${paragraphDiff.changes.length} changes`);
  console.log(`Current text: "${paragraphDiff.currentText.substring(0, 100)}..."`);

  // return await Word.run(async (context) => {
  //   let targetRange = await getTextRange(context, paragraphDiff.originalText);
  //   let acrossParagraphs = false;
  //   if (!targetRange) {
  //     targetRange = await getTextRangeAcrossParagraphs(context, paragraphDiff.originalText);
  //     acrossParagraphs = true;
  //   }
  //   if (targetRange) {
  //     targetRange.select();
  //     await context.sync();
  //     return true;
  //   } else {
  //     return false;
  //   }
  // });

  // Strategy 1: Try to locate using the current text (which is visible in the document)
  if (paragraphDiff.currentText && paragraphDiff.currentText.length > 10) {
    try {
      const success = await locateByParagraphWithFallback(paragraphDiff.currentText);
      if (success) {
        console.log("Successfully located paragraph using current text");
        return true;
      }
    } catch (error) {
      console.log("Current text location failed:", error);
    }
  }

  // Strategy 2: Try with truncated current text
  if (paragraphDiff.currentText.length > 50) {
    try {
      const truncated = paragraphDiff.currentText.substring(0, 100).trim();
      const success = await locateByParagraphWithFallback(truncated);
      if (success) {
        console.log("Successfully located paragraph using truncated current text");
        return true;
      }
    } catch (error) {
      console.log("Truncated current text location failed:", error);
    }
  }

  // Strategy 3: Try using unchanged portions of the text
  if (paragraphDiff.originalText && paragraphDiff.currentText) {
    try {
      // Find the longest common substring that might be unchanged
      const commonWords = findCommonWords(paragraphDiff.originalText, paragraphDiff.currentText);
      if (commonWords.length > 0) {
        const commonText = commonWords.slice(0, 10).join(" "); // Use first 10 common words
        if (commonText.length > 15) {
          const success = await locateByParagraphWithFallback(commonText);
          if (success) {
            console.log("Successfully located paragraph using common text");
            return true;
          }
        }
      }
    } catch (error) {
      console.log("Common text location failed:", error);
    }
  }

  console.log("All paragraph diff location strategies failed");
  return false;
}

/**
 * Find common words between two texts
 * @param text1 First text
 * @param text2 Second text
 * @returns Array of common words in order of appearance
 */
function findCommonWords(text1: string, text2: string): string[] {
  const words1 = text1.split(/\s+/).filter((word) => word.length > 3);
  const words2 = text2.split(/\s+/).filter((word) => word.length > 3);
  const commonWords: string[] = [];

  for (const word of words1) {
    if (words2.includes(word) && !commonWords.includes(word)) {
      commonWords.push(word);
    }
  }

  return commonWords;
}


/**
 * Merge the consecutive changes of the same type in a DiffChange array
 * so that the result is not word by word but in longer text segments
 * @param changes The array of DiffChange to be consolidated
 * @returns DiffChange[] New DiffChange array
 */
function consolidateChanges(changes: DiffChange[]): DiffChange[] {
  let newChanges: DiffChange[] = [];
  let change: DiffChange;
  let newText: string;

  let i: number, j: number, startIndex: number;
  i = 0;
  while (i < changes.length) {
    change = changes[i];
    startIndex = i;
    newText = change.text;
    j = i + 1;
    while (j < changes.length && changes[j].type === changes[startIndex].type) {
      newText = newText + changes[j].text
      j++;
    }
    newChanges.push({
      type: changes[startIndex].type,
      text: newText,
      position: changes[startIndex].position,
      length: newText.length,
    });
    i = j;
  }
  return newChanges;
}

/**
 * Find text within a given Word.Range such that the text immediately
 * precedes another Word.range.
 * @param context Context that represents the current document
 * @param searchText Text to be found
 * @param searchRange The Word.Range text search will be conducted within
 * @param compareRange The Word.Range that searchText must precedes
 * @returns Promise<Word.Range> The Word.Range that corresponds to searchText
 *                              exactly. If not found, null is returned
 */
async function getTextRangeBefore(
  context: Word.RequestContext,
  searchText: string,
  searchRange: Word.Range,
  compareRange: Word.Range
): Promise<Word.Range> {
  // console.log(`searching for ${searchText}`)
  const searchResults = searchRange.search(searchText, { matchCase: true, matchWildcards: false });
  searchResults.load('items');
  await context.sync();
  // console.log("search results load done");

  if (searchResults.items.length === 0) {
    // console.log("not found");
    return null;
  }

  const comparisons = searchResults.items.map(item => {
    const range = item.getRange("Whole");
    const comparison = range.compareLocationWith(compareRange);
    return { range, comparison };
  });

  await context.sync();

  for (let i = comparisons.length - 1; i >= 0; i--) {
    const { range, comparison } = comparisons[i];
    const loc = comparison.value;
    // console.log(loc);
    if (loc === "AdjacentBefore" || loc === "OverlapsBefore" ||
      loc === "Before" || loc === "ContainsEnd") {
      return range;
    }
  }

  return null;
}



/**
 * Find text within a given Word.Range such that the text immediately
 * precedes another Word.range. The text and both Word.Range could span
 * across paragraphs.
 * @param context Context that represents the current document
 * @param searchText Text to be found
 * @param searchRange The Word.Range text search will be conducted within
 * @param compareRange The Word.Range that searchText must precedes
 * @returns Promise<[Word.Range, boolean]>  Word.Range corresponds to
 *    searchText, and the boolean corresponds to whether the matched text
 *    begins with a paragraph break.
 */
async function getTextRangeBeforeAcrossParagraphs(
  context: Word.RequestContext,
  searchText: string,
  searchRange: Word.Range,
  compareRange: Word.Range,
): Promise<Word.Range> {
  const debug = false;

  const paragraphs = searchRange.paragraphs;
  paragraphs.load("items, items/text");
  await context.sync();

  const sep = "\r"; // paragraph separator unlikely to appear in text
  const paraTexts = paragraphs.items.map((p) => p.text);
  const combined = paraTexts.join(sep);

  if (debug) {
    console.log(`getTextRangeBeforeAcrossParagraphs : begin to search "${JSON.stringify(searchText)}" before runningRange across paragraphs`);
  }
  const searchResults = await getTextRangeWithinParagraphs(context, searchText, paragraphs, paraTexts, combined);
  if (debug) {
    console.log(`getTextRangeBeforeAcrossParagraphs : end search - ${searchResults.length} results`);
  }
  if (searchResults.length === 0) {
    console.log("getTextRangeBeforeAcrossParagraphs: no search results");
    return null;
  }

  const comparisons = searchResults.map((range) => {
    const comparison = range.compareLocationWith(compareRange);
    range.load('text');
    return { range, comparison };
  });

  compareRange.load('text');

  await context.sync();

  for (let i = comparisons.length - 1; i >= 0; i--) {
    const { range, comparison } = comparisons[i];
    const loc = comparison.value;

    if (debug) {
      console.log(`${loc} - "${JSON.stringify(range.text)}" - "${JSON.stringify(compareRange.text)}"`);
    }
    if (loc === "AdjacentBefore" || loc === "OverlapsBefore" || loc === "Before" || loc === "ContainsEnd") {
      return range;
    }
  }

  return null;
}

/**
 * Locate content by full document search
 * @param context Current word document
 * @param targetText Text to search
 * @param body The Word.Body content to search within
 * @returns Promise<Word.Range> The Word.Range corresponding to exactly
 *                              the search text in document
 */

export async function getTextRange(
  context: Word.RequestContext,
  targetText: string,
  body?: Word.Body
): Promise<Word.Range | null> {
  const debug_mode = true;

  // Normalize soft line breaks (\x0B from <w:br/>) to spaces so the search
  // text matches what Word stores for paragraphs containing line breaks.
  const normalizedText = targetText; //.replace(/\x0B/g, ' ');

  let prefix: string;
  let suffix: string;
  let foundRange: Word.Range;

  if (normalizedText.length < 256) {
    prefix = normalizedText;
  } else {
    prefix = normalizedText.slice(0, 255);
  }

  if (body == null) body = context.document.body;
  let searchResults = body.search(prefix, {
    matchCase: true,
    matchWildcards: false,
  });

  searchResults.load('items');
  await context.sync();

  if (searchResults.items.length == 0) {
    console.log(`Text not found: "${JSON.stringify(prefix)}"`)
    return null;
  } else {
    foundRange = searchResults.items[0].getRange("Whole");
    foundRange.load('text');
    await context.sync();
    if (debug_mode) {
      console.log(`Prefix text: "${foundRange.text}"`);
    }
    if (normalizedText.length >= 256) {
      suffix = normalizedText.slice(-255);
      searchResults = body.search(suffix, {
        matchCase: true,
        matchWildcards: false,
      });
      searchResults.load('items');
      await context.sync();
      if (searchResults.items.length == 0) {
        console.log(`Text not found: "${JSON.stringify(suffix)}"`)
        return null;
      } else {
        const suffixRange = searchResults.items[0].getRange("Whole");
        suffixRange.load('text');
        await context.sync();
        console.log(`Suffix text: "${suffixRange.text}"`);
        foundRange = foundRange.expandTo(suffixRange);
      }
    }
    return foundRange;
  }
}

// ============================================
// SEARCH TEXT NORMALIZATION
// ============================================

/**
 * Normalize typographic quotation marks and semicolons to their ASCII equivalents.
 * Word documents often use "smart quotes" (curly) which differ from straight quotes
 * produced during text extraction. This function ensures search text uses consistent
 * ASCII characters so the Locate feature works regardless of quote/semicolon style.
 *
 * Characters normalized:
 * - Left/right double quotes (\u201C \u201D), double low-9 (\u201E) → straight "
 * - Left/right single quotes (\u2018 \u2019), single low-9 (\u201A) → straight '
 * - Prime (\u2032) and double prime (\u2033) → straight ' and " respectively
 * - Fullwidth semicolon (\uFF1B), Greek question mark (\u037E) → ASCII ;
 * - Soft line breaks (\x0B / \v from <w:br/>) → space
 */
export function normalizeSearchText(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\uFF1B\u037E]/g, ';')
    .replace(/\x0B/g, ' ');
}

/**
 * Collapse all whitespace (including soft line breaks \v / \x0B) into single
 * spaces for reliable text comparison between Word content and extracted text.
 */
function collapseWhitespace(text: string): string {
  return text.replace(/[\s\x0B]+/g, ' ').trim();
}

// type rangeAcrossParagraphPair = [Word.Range, boolean];

function escapeString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]]/g, "\\$&");
}

async function getTextRangeWithinParagraphs(
    context: Word.RequestContext,
    searchText: string,
    paragraphs: Word.ParagraphCollection,
    paraTexts: string[],
    fullText: string,
): Promise<Word.Range[]> {
  // Build a regex that matches the search text with flexible whitespace, case-sensitive
  const debug_mode = true;
  const escapedSearchText = escapeString(searchText);
  const pattern = new RegExp(escapedSearchText.replace(/(\n)+/g, "\\s*(?:\\r?\\n|\\r)\\s*"), "g");
  if (debug_mode) {
    console.log(`the pattern to search is: ${pattern}`);
    console.log(paraTexts);
  }
  let matchedRanges: Word.Range[] = [];

  // Map combined index → paragraph index
  const starts: number[] = new Array(paraTexts.length);
  let pos = 0;
  for (let i = 0; i < paraTexts.length; i++) {
    starts[i] = pos;
    pos += paraTexts[i].length + 1; // +1 for separator
  }

  const findParagraph = (offset: number): number => {
    let lo = 0, hi = starts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (offset < starts[mid]) hi = mid - 1;
      else lo = mid + 1;
    }
    return (lo < 1) ? 0 : lo - 1;
  }

  let match: RegExpExecArray | null;
  let matchStart: number, matchEnd: number;
  let startP: number, endP: number;
  let startOffset: number, endOffset: number;
  let pStart: Word.Paragraph, pEnd: Word.Paragraph;

  while ((match = pattern.exec(fullText)) !== null) {
    if (debug_mode) {
      console.log("getTextRangeWithinParagraphs : searchText = " + JSON.stringify(searchText));
      console.log(`getTextRangeWithinParagraphs : matched text: ${JSON.stringify(match[0])} at index ${match.index}`);
      console.log("getTextRangeWithinParagraphs : lastIndex: " + pattern.lastIndex);
    }

    matchStart = match.index;
    matchEnd = match.index + match[0].length;

    startP = findParagraph(matchStart);
    endP = findParagraph(matchEnd);
    pStart = paragraphs.items[startP];
    pEnd = paragraphs.items[endP];

    if (debug_mode) {
      console.log(`getTextRangeWithinParagraphs : Found in paragraphs from ${startP} to ${endP}`);
    }
    // Extract substrings within first/last paragraphs for precise in-paragraph search
    startOffset = matchStart - starts[startP];
    endOffset = matchEnd - starts[endP];

    if (startP === endP) {
      const startSearch = pStart.search(match[0], {matchCase: true, matchWildcards: false});
      startSearch.load('items');
      await context.sync();
      // console.log("search completed within the same paragraph");
      let localRangeCount = startSearch.items.length;
      if (debug_mode) {
        console.log(`getTextRangeWithinParagraphs : found ${localRangeCount} instances in Paragraph ${startP}`);
      }
      for (let item of startSearch.items) {
        matchedRanges.push(item.getRange("Whole"));
      }
      while (localRangeCount > 1) {
        match = pattern.exec(fullText);
        localRangeCount--;
      }
      continue;
    }

    const firstFragment = paraTexts[startP].slice(
        startOffset,
        Math.min(startOffset + 200, paraTexts[startP].length),
    );
    const lastFragment = paraTexts[endP].slice(
        Math.max(0, endOffset - 200),
        endOffset
    );
    console.log(`first fragment = ${JSON.stringify(firstFragment)}`);
    console.log(`last fragment = ${JSON.stringify(lastFragment)}`);

    // Search small fragments to refine exact start/end inside those paragraphs

    const startSearch = firstFragment ? pStart.search(firstFragment, {matchCase: true, matchWildcards: false}) : null;
    const endSearch = lastFragment ? pEnd.search(lastFragment, {matchCase: true, matchWildcards: false}) : null;

    if (startSearch) startSearch.load("items");
    if (endSearch) endSearch.load("items");
    await context.sync();


    if (debug_mode) {
      if (!startSearch) {
        console.log("startSearch is null");
      } else {
        console.log(startSearch.items);
      }
      if (!endSearch) {
        console.log("endSearch is null");
      } else {
        console.log(endSearch.items);
      }
    }

    var startRange : Word.Range | null = null;
    var endRange : Word.Range | null = null;
    if (startSearch && startSearch.items.length) {
      startRange = startSearch.items[startSearch.items.length - 1].getRange("Whole");
    } else {
      if (startOffset == paraTexts[startP].length) {
        startRange = pStart.getRange("End");
      }
    }
    if (endSearch && endSearch.items.length) {
      endRange = endSearch.items[0].getRange("Whole");
    } else {
      if (endOffset == 0) {
        endRange = pEnd.getRange("Start");
      }
    }

    let resultRange: Word.Range | null = null;
    if (startRange && endRange) {
      resultRange = startRange.expandTo(endRange);
    } else if (startRange) {
      resultRange = startRange;
    } else if (endRange) {
      resultRange = endRange;
    }
    if (resultRange) {
      // matchedRanges.push([resultRange, match[0][0] === '\r']);
      matchedRanges.push(resultRange);
    }
  }

  return matchedRanges;
}

export async function getTextRangeAcrossParagraphs(
  context: Word.RequestContext,
  targetText: string,
  body?: Word.Body
): Promise<Word.Range | null> {
  if (body == null) body = context.document.body;
  const paragraphs = body.paragraphs;
  paragraphs.load("items, items/text");
  await context.sync();

  const sep = "\r"; // paragraph separator unlikely to appear in text
  const paraTexts: string[] = paragraphs.items.flatMap(p => {
    return p.text
        .split('\x0b')
        .filter(s => s.length > 0);
  });
  const combined = paraTexts.join(sep);

  let prefix: string;

  if (targetText.length <= 200) {
    prefix = targetText;
  } else {
    prefix = targetText.slice(0, 200);
  }

  const prefixRanges = await getTextRangeWithinParagraphs(context, prefix, paragraphs, paraTexts, combined);
  
  if (prefixRanges.length == 0) {
    console.log(`Cannot find the prefix across paragraphs: "${prefix}"`);
    return null;
  }

  const prefixRange = prefixRanges[0];
  if (targetText.length > 200) {
    const suffix = targetText.slice(-200);
    const suffixRanges = await getTextRangeWithinParagraphs(context, suffix, paragraphs, paraTexts, combined);
    const suffixRange = suffixRanges[0];
    return prefixRange.expandTo(suffixRange);
  } else {
    return prefixRange;
  }
}

// ============================================
// TEXT BOX (SHAPE) SEARCH FALLBACK
// ============================================

async function getTextRangeInShape(
    context: Word.RequestContext,
    shape: Word.Shape,
    targetText: string
): Promise<Word.Range | null> {
  const paragraphs = shape.body.paragraphs;
  paragraphs.load("items, items/text");
  await context.sync();

  const sep = "\r"; // paragraph separator unlikely to appear in text
  const paraTexts: string[] = paragraphs.items.flatMap(p => {
    return p.text
        .split('\x0b')
        .filter(s => s.length > 0);
  });
  const combined = paraTexts.join(sep);

  const start = combined.indexOf(targetText);
  if (start < 0) return null;

  const end = start + targetText.length;

  function mapOffset(globalOffset:number): {i: number, off: number} {
    let acc = 0;
    for (let i = 0; i < paraTexts.length; i++) {
      const len = paraTexts[i].length;
      if (globalOffset <= acc + len) {
        return { i, off: Math.max(0, globalOffset - acc) };
      }
      acc += len + sep.length; // account for inserted separator
    }
    return { i: paraTexts.length - 1, off: paraTexts[paraTexts.length - 1].length };
  }

  const s = mapOffset(start);
  const e = mapOffset(end);

  async function rangeFromLocalOffsets(
      para: Word.Paragraph,
      startOff: number,
      endOff: number
  ): Promise<Word.Range | null> {
    const whole = para.getRange("Whole");
    const runs = whole.getTextRanges([" ", "\t", "\n", "\r"], false); // WordApi 1.3
    runs.load("items/text");
    await context.sync();

    const items = runs.items;
    if (!items || items.length === 0) return whole;

    const prefixLengths = new Array(items.length);
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      const t = items[i].text || "";
      sum += t.length;
      prefixLengths[i] = sum;
    }

    function firstPrefixGreaterThan(x) {
      let lo = 0, hi = prefixLengths.length - 1, ans = prefixLengths.length; // default "not found"
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (prefixLengths[mid] > x) {
          ans = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return ans;
    }

    let startWord = firstPrefixGreaterThan(startOff);
    if (startWord === prefixLengths.length) return null; // start beyond paragraph content

    let endWord = firstPrefixGreaterThan(endOff - 1);
    if (endWord === prefixLengths.length) endWord = prefixLengths.length - 1; // end beyond -> clamp

    // Expand to cover [startWord..endWord]
    return items[startWord].expandTo(items[endWord]);
  }

  const startPara = paragraphs.items[s.i];
  const endPara = paragraphs.items[e.i];

  let startRange: Word.Range | null = null;
  let endRange: Word.Range | null = null;

  if (s.i === e.i) {
    // match entirely within one paragraph
    const r = await rangeFromLocalOffsets(startPara, s.off, e.off);
    try {
      r.select(); await context.sync(); return r;
    } catch (_) {
      // fallback below
      shape.select(); await context.sync(); return null;
    }
  }

  startRange = await rangeFromLocalOffsets(startPara, s.off, paraTexts[s.i].length);
  endRange   = await rangeFromLocalOffsets(endPara, 0, e.off);

  return startRange.expandTo(endRange);
}


/**
 * Search for text inside text boxes (shapes) when body search fails.
 * Requires WordApiDesktop 1.1+ — falls back gracefully if shapes API is unavailable.
 */
export async function getTextRangeInShapes(
  context: Word.RequestContext,
  targetText: string
): Promise<Word.Range | null> {
  // Shape API requires WordApiDesktop 1.3
  if (!Office.context.requirements.isSetSupported('WordApiDesktop', '1.3')) {
    console.log('[Shapes] WordApiDesktop 1.3 not supported — cannot search shapes');
    return null;
  }

  const shapes = context.document.body.shapes;
  shapes.load('items');
  await context.sync();

  if (shapes.items.length === 0) {
    console.log(`[Shapes] Shapes not found`);
    return null;
  }

  let textRange : Word.Range | null = null;
  for (const shape of shapes.items) {
    try {
      const textRange = await getTextRangeInShape(context, shape, targetText);
      if (!textRange) return textRange;
    } catch (shapeError) {
      // Some shapes may not have a searchable body (e.g., pictures)
      console.log('[Shapes] Could not search shape:', shapeError);
    }
  }

  return null;
}

export default getTextRangeInShapes

/**
 * Replace a term within a range. For body-derived ranges, uses search() to find
 * and replace the matched term. For shape-derived ranges, search() hangs Word
 * indefinitely (even with WordApiDesktop 1.2), so we use getTextRanges() to
 * locate the term by character position and insertText() to replace it. Falls
 * back to selecting for manual editing if that also fails.
 *
 * @param context Word request context
 * @param parentRange The range to search within (e.g. the located sentence)
 * @param term The term to find
 * @param replacement The text to replace the term with
 * @param options matchCase, matchWholeWord, and fromShape flag
 * @returns 'replaced' if done, 'in_shape' if text is in a shape and needs manual edit, 'not_found' if term not found
 */
export async function replaceTermInRange(
  context: Word.RequestContext,
  parentRange: Word.Range,
  term: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeWord?: boolean; fromShape?: boolean } = {}
): Promise<'replaced' | 'in_shape' | 'not_found'> {
  const { matchCase = true, matchWholeWord = true, fromShape = false } = options;

  // search() hangs on shape-derived ranges, so use getTextRanges() to locate
  // the term by character position, then insertText() to replace it.
  if (fromShape) {
    try {
      const wordRanges = parentRange.getTextRanges([' '], false);
      wordRanges.load('items/text');
      await context.sync();

      if (wordRanges.items.length > 0) {
        const fullText = wordRanges.items.map(r => r.text).join('');
        const haystack = matchCase ? fullText : fullText.toLowerCase();
        const needle = matchCase ? term : term.toLowerCase();
        const termPos = haystack.indexOf(needle);

        if (termPos !== -1) {
          const termEnd = termPos + needle.length;
          let charPos = 0;
          let startIdx = -1;
          let endIdx = -1;

          for (let i = 0; i < wordRanges.items.length; i++) {
            const wordEnd = charPos + wordRanges.items[i].text.length;
            if (startIdx === -1 && wordEnd > termPos) startIdx = i;
            if (endIdx === -1 && wordEnd >= termEnd) { endIdx = i; break; }
            charPos = wordEnd;
          }

          if (startIdx !== -1 && endIdx !== -1) {
            const termRange = startIdx === endIdx
              ? wordRanges.items[startIdx]
              : wordRanges.items[startIdx].expandTo(wordRanges.items[endIdx]);
            termRange.load('text');
            await context.sync();

            // Replace only the term within the range, preserving any extra
            // characters (e.g., trailing space from word splitting)
            const rangeText = termRange.text;
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, matchCase ? '' : 'i');
            const newText = rangeText.replace(regex, replacement);
            termRange.insertText(newText, Word.InsertLocation.replace);
            await context.sync();
            return 'replaced';
          }
        }
      }
    } catch (shapeReplaceError) {
      console.log('[replaceTermInRange] Shape replacement via getTextRanges failed:', shapeReplaceError);
    }

    // Fallback: select for manual editing if getTextRanges approach failed
    try {
      parentRange.select();
      await context.sync();
    } catch (selectError) {
      console.log('[replaceTermInRange] Could not select shape range:', selectError);
    }
    return 'in_shape';
  }

  // Body-derived ranges: use search() to replace the matched term
  try {
    const searchResults = parentRange.search(term, {
      matchCase,
      matchWholeWord,
    });
    searchResults.load('items');
    await context.sync();

    if (searchResults.items.length > 0) {
      for (const range of searchResults.items) {
        range.insertText(replacement, Word.InsertLocation.replace);
      }
      await context.sync();
      return 'replaced';
    }
  } catch (searchError) {
    console.log('[replaceTermInRange] search() failed:', searchError);
  }

  return 'not_found';
}

/**
 * Locate and select text in the document, searching body first, then text boxes.
 * This is the recommended function for all "locate" button handlers.
 */
export async function locateText(text: string): Promise<boolean> {
  return Word.run(async (context) => {
    // Try body search first
    let targetRange = await getTextRange(context, text);
    if (!targetRange) {
      targetRange = await getTextRangeAcrossParagraphs(context, text);
    }

    // Fall back to text box search
    if (!targetRange) {
      targetRange = await getTextRangeInShapes(context, text);
    }

    if (targetRange) {
      targetRange.select();
      await context.sync();
      return true;
    }

    console.warn('Unable to locate text anywhere in document:', text.substring(0, 50));
    return false;
  });
}

/**
 * Apply word-level track changes to Word document
 * This creates granular track changes for each individual word/phrase change
 * @param proposal The paragraph diff proposal
 * @param targetParagraphText Optional target paragraph text to locate
 * @returns Promise<boolean> Success status
 */
export async function applyWordLevelTrackChanges(
  proposal: ParagraphDiffProposal,
  targetParagraphText?: string
): Promise<boolean> {
  const debug_mode = false;
  if (!proposal.isValid || !proposal.hasChanges) {
    throw new Error("Invalid or empty diff proposal");
  }
  if (debug_mode) {
    console.log("applyWordLevelTrackChanges : targetParagraphText : " + targetParagraphText);
  }
  try {
    return await Word.run(async (context) => {
      // Enable track changes first
      try {
        context.document.settings.add("TrackChanges", true);
        await context.sync();
      } catch (trackChangesError) {
        console.log("Track changes setting already exists or failed to set");
      }

      // Locate the target paragraph
      let targetRange = await getTextRange(context, proposal.originalText);
      // targetRange.load('text');
      // await context.sync();
      // console.log("getting targetRange done: " + targetRange.text);	
      let acrossParagraphs = false;
      if (!targetRange) {
        if (debug_mode) {
          console.log("unable to get text range of original text without paragraph. Now trying across paragraphs");
        }
        targetRange = await getTextRangeAcrossParagraphs(context, proposal.originalText);
        acrossParagraphs = true;
      }
      if (!targetRange) {
        throw new Error("Target paragraph not found in document");
      }

      let runningRange: Word.Range = targetRange.getRange("End");
      let rangeNeeded: Word.Range = null;
      let rangeHead: Word.Range = null;
      let searchText: string;
      let paragraphBreakFlag: boolean;

      // Apply changes in reverse order (from end to start)
      const changes = consolidateChanges(proposal.changes).reverse();
      if (debug_mode) {
        console.log(changes);
        console.log("across paragraphs = " + acrossParagraphs);
      }
      let change: DiffChange;

      for (change of changes) {
        // console.log(`Processing change: "${change.text}" - ${change.type}`);
        rangeNeeded = null;
        if (change.type === 'insert') {
          rangeNeeded = runningRange.getRange("Start").insertText(change.text, "Before");
        } else {
          if (change.length < 256) {
            searchText = change.text;
          } else {
            searchText = change.text.slice(-255);
          }
          if (debug_mode) {
            console.log(`Applying track changes : searchText = ${JSON.stringify(searchText)}`);
          }
          if (acrossParagraphs) {
            rangeNeeded = await getTextRangeBeforeAcrossParagraphs(
               context, searchText, targetRange, runningRange);
          } else {
            rangeNeeded = await getTextRangeBefore(context, searchText, targetRange, runningRange);
          }
          if (!rangeNeeded) {
            throw new Error(`Unable to locate properly: "${searchText}"`)
          } 
          if (change.length >= 256) {
            searchText = change.text.slice(0, 255);
            console.log("searchText head: " + searchText);
            if (acrossParagraphs) {
              rangeHead = await getTextRangeBeforeAcrossParagraphs(context, searchText, targetRange, rangeNeeded);
            } else {
              rangeHead = await getTextRangeBefore(context, searchText, targetRange, rangeNeeded);
            }            
            if (rangeHead != null) {
              rangeNeeded = rangeNeeded.expandTo(rangeHead);
              // rangeNeeded.load('text');
              await context.sync();
              // console.log("rangeNeeded expanded: " + rangeNeeded.text);
            } else {
              throw new Error(`Unable to locate properly the prefix: "${searchText}"`)
            }
          }
          if (change.type === 'delete') {
            rangeNeeded.delete();
          } 
          // else if (paragraphBreakFlag) {
          //   console.log("insert space in place of paragraph break");
          //   rangeNeeded = rangeNeeded.getRange("Start").insertText(" ", "Before");
          // }
        }
        if (rangeNeeded != null) {
          runningRange = runningRange.expandTo(rangeNeeded);
          // console.log("running range expanded");
          // runningRange.load('text');
          // await context.sync();
          // console.log(runningRange.text);
        }
        await context.sync();
      }
      return true;
    });
  } catch (error) {
    console.error("Error applying word-level track changes to Word:", error);
    throw error;
  }
}

/**
 * Check whether amended text represents a full-section deletion.
 * Mirrors the backend logic in contract-review.ts.
 */
export function isFullDeletion(amendedText: string): boolean {
  const DELETION_MARKERS = [
    "[DELETED]",
    "[INTENTIONALLY DELETED]",
    "[RESERVED]",
    "INTENTIONALLY DELETED",
    "RESERVED",
    "[INTENTIONALLY OMITTED]",
  ];
  const normalized = amendedText.trim().toUpperCase();
  return DELETION_MARKERS.some(
    (marker) =>
      normalized === marker.toUpperCase() ||
      normalized === marker.replace(/[\[\]]/g, "").toUpperCase()
  );
}

/**
 * Replace the located original text with "[INTENTIONALLY DELETED]" using
 * track-changes mode.  Creates its own Word.run context.
 * @param originalText The text to locate and replace
 */
export async function applyFullDeletionReplacement(originalText: string): Promise<void> {
  await Word.run(async (context) => {
    // Enable track changes
    try {
      context.document.settings.add("TrackChanges", true);
      await context.sync();
    } catch (_e) {
      console.log("Track changes setting already exists or failed to set");
    }

    let targetRange = await getTextRange(context, originalText);
    if (!targetRange) {
      targetRange = await getTextRangeAcrossParagraphs(context, originalText);
    }
    if (!targetRange) {
      throw new Error("Unable to locate text for deletion");
    }

    targetRange.insertText("[INTENTIONALLY DELETED]", "Replace");
    await context.sync();
  });
}

/**
 * Insert a new section **after** the anchor text.
 * Finds the anchor, gets the last paragraph's end, inserts the new text,
 * detaches inserted paragraphs from any list numbering, and scrolls to the
 * inserted content.  Creates its own Word.run context.
 * @param anchorText  Text of the preceding section (used to locate insertion point)
 * @param newSectionText  The new content to insert
 */
export async function insertNewSectionAfterAnchor(
  anchorText: string,
  newSectionText: string
): Promise<void> {
  await Word.run(async (context) => {
    let targetRange = await getTextRange(context, anchorText);
    if (!targetRange) {
      targetRange = await getTextRangeAcrossParagraphs(context, anchorText);
    }
    if (!targetRange) {
      throw new Error("Unable to locate previous section in document");
    }

    const targetRangeParagraphs = targetRange.paragraphs;
    targetRangeParagraphs.load("items");
    await context.sync();

    const endRange = targetRangeParagraphs.getLast().getRange("After");
    const insertedRange = endRange.insertText(newSectionText + "\n", "After");
    await context.sync();

    // Remove automatic list formatting from inserted paragraphs
    const insertedParagraphs = insertedRange.paragraphs;
    insertedParagraphs.load("items");
    await context.sync();

    for (const paragraph of insertedParagraphs.items) {
      try {
        const listItem = paragraph.listItemOrNullObject;
        listItem.load("isNullObject");
        await context.sync();

        if (!listItem.isNullObject) {
          paragraph.detachFromList();
          paragraph.leftIndent = 0;
          await context.sync();
        }
      } catch (detachError) {
        console.log("Could not detach paragraph from list:", detachError);
      }
    }

    // Scroll to the inserted text
    insertedRange.select();
    await context.sync();
  });
}

/**
 * Import paragraph text from current Word document selection
 * @returns Promise<string> The selected paragraph text
 */
export async function importParagraphFromSelection(): Promise<string> {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();

      if (!selection.text || selection.text.trim() === "") {
        throw new Error("No text selected. Please select some text from the document.");
      }

      return selection.text.trim();
    });
  } catch (error) {
    console.error("Error importing paragraph from selection:", error);
    throw error;
  }
}

/**
 * Enhanced track changes location function that works with the new diff approach
 * @param trackChanges Array of track changes or paragraph diffs
 * @returns Enhanced location and navigation functions
 */
export async function createTrackChangesNavigator(
  trackChanges: TrackChangeItem[] | ParagraphDiff[]
): Promise<{
  locateByIndex: (index: number) => Promise<boolean>;
  locateChange: (change: TrackChangeItem | ParagraphDiff) => Promise<boolean>;
  groupByParagraph: () => Map<string, (TrackChangeItem | ParagraphDiff)[]>;
  getTotalChanges: () => number;
  getChangesSummary: () => string;
}> {
  const isParagraphDiffs = trackChanges.length > 0 && "diffHtml" in trackChanges[0];

  const locateByIndex = async (index: number): Promise<boolean> => {
    if (index < 0 || index >= trackChanges.length) {
      console.log(`Invalid index: ${index}`);
      return false;
    }

    const change = trackChanges[index];
    return await locateChange(change);
  };

  const locateChange = async (change: TrackChangeItem | ParagraphDiff): Promise<boolean> => {
    if ("diffHtml" in change) {
      // This is a ParagraphDiff
      return await locateParagraphDiff(change as ParagraphDiff);
    } else {
      // This is a TrackChangeItem - use the enhanced location with current text
      const item = change as TrackChangeItem;
      console.log(
        `Locating track change: ${item.kind} - "${item.kind === "delete" ? item.originalText : item.text}"`
      );

      // For the new approach, all items should have locationText as the current paragraph text
      if (item.locationText && item.locationText.length > 10) {
        const success = await locateByParagraphWithFallback(item.locationText);
        if (success) {
          console.log("Successfully located track change using location text");
          return true;
        }
      }

      // Fallback to paragraph text
      if (item.paragraph && item.paragraph.length > 20) {
        const success = await locateByParagraphWithFallback(item.paragraph);
        if (success) {
          console.log("Successfully located track change using paragraph text");
          return true;
        }
      }

      console.log("Failed to locate track change");
      return false;
    }
  };

  const groupByParagraph = (): Map<string, (TrackChangeItem | ParagraphDiff)[]> => {
    const groups = new Map<string, (TrackChangeItem | ParagraphDiff)[]>();

    for (const change of trackChanges) {
      let paragraphKey: string;

      if ("diffHtml" in change) {
        // ParagraphDiff
        const diff = change as ParagraphDiff;
        paragraphKey = diff.paragraphId;
      } else {
        // TrackChangeItem
        const item = change as TrackChangeItem;
        paragraphKey = item.paragraph.substring(0, 100); // Use first 100 chars as key
      }

      if (!groups.has(paragraphKey)) {
        groups.set(paragraphKey, []);
      }
      groups.get(paragraphKey)!.push(change);
    }

    return groups;
  };

  const getTotalChanges = (): number => {
    if (isParagraphDiffs) {
      return (trackChanges as ParagraphDiff[]).reduce(
        (total, diff) => total + diff.changes.length,
        0
      );
    } else {
      return trackChanges.length;
    }
  };

  const getChangesSummary = (): string => {
    if (isParagraphDiffs) {
      const diffs = trackChanges as ParagraphDiff[];
      const totalChanges = getTotalChanges();
      const insertions = diffs.reduce(
        (sum, diff) => sum + diff.changes.filter((c) => c.type === "insert").length,
        0
      );
      const deletions = diffs.reduce(
        (sum, diff) => sum + diff.changes.filter((c) => c.type === "delete").length,
        0
      );

      return `${diffs.length} paragraphs with changes: ${insertions} insertions, ${deletions} deletions (${totalChanges} total changes)`;
    } else {
      const items = trackChanges as TrackChangeItem[];
      const insertions = items.filter((item) => item.kind === "insert").length;
      const deletions = items.filter((item) => item.kind === "delete").length;

      return `${items.length} total changes: ${insertions} insertions, ${deletions} deletions`;
    }
  };

  return {
    locateByIndex,
    locateChange,
    groupByParagraph,
    getTotalChanges,
    getChangesSummary,
  };
}
