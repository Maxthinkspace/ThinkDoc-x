import type { DocumentNodeWithRange, TextToken } from '@/src/types/documents';

// ========================================
// SHARED HELPER FUNCTIONS FOR DOCUMENT PARSING
// ========================================

/**
 * Detect if document is in English or Chinese based on text sample
 */
export function detectDocumentLanguage(cleanText: string): "english" | "chinese" {
  const sample = cleanText.substring(0, 100);
  const hasChinese = /[\u4e00-\u9fa5]/.test(sample);
  return hasChinese ? "chinese" : "english";
}

// ========================================
// NUMBERING MODEL TYPES (Signature-based approach)
// ========================================

/**
 * Level definition from abstractNum
 */
interface LevelDef {
  ilvl: number;
  numFmt: string;      // decimal, lowerLetter, upperRoman, bullet, etc.
  lvlText: string;     // template e.g. "%1.%2", "%1(%2)", "•"
  start: number;
}

/**
 * Numbering instance (w:num element)
 */
interface NumInst {
  numId: number;
  abstractNumId: number;
  startOverrideByIlvl: Map<number, number>;  // ilvl -> startOverride
}

/**
 * Complete numbering model for a document
 */
export interface NumberingModel {
  numIdToInst: Map<number, NumInst>;
  abstractLevelDef: Map<string, LevelDef>;  // key: `${abstractNumId}_${ilvl}`
}

/**
 * Resolved level with start override applied
 */
interface ResolvedLevel {
  abstractNumId: number;
  levelDef: LevelDef;
  start: number;
  numFmt: string;
  lvlText: string;
}

/**
 * List run tracking for signature-based continuity.
 * A "run" continues across different numIds if their abstractNum signatures match.
 */
interface ListRun {
  runId: number;
  signature: string;           // Canonical form of abstractNum definition
  abstractNumId: number;
  counters: (number | null)[]; // counters[ilvl] = current value or null (uninitialized)
}

/**
 * Numbering state for a single extraction mode (amended/original/combined).
 */
interface NumberingState {
  currentRun: ListRun | null;
  nextRunId: number;
}

/**
 * Build numbering map from numbering XML document
 */
export function buildNumberingMap(xmlDoc: Document): any {
  const numberingMap: any = { abstractNums: {}, numToAbstract: {} };
  const abstractNums = xmlDoc.getElementsByTagNameNS("*", "abstractNum");

  for (let i = 0; i < abstractNums.length; i++) {
    const abstractNum = abstractNums[i];
    const abstractNumId = abstractNum.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "abstractNumId"
    );

    if (!abstractNumId) continue;

    numberingMap.abstractNums[abstractNumId] = {};

    const lvls = abstractNum.getElementsByTagNameNS("*", "lvl");

    for (let j = 0; j < lvls.length; j++) {
      const lvl = lvls[j];
      const ilvl = lvl.getAttributeNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "ilvl"
      );

      const numFmt = lvl.getElementsByTagNameNS("*", "numFmt")[0];
      const format = numFmt
        ? numFmt.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          )
        : "decimal";

      const lvlText = lvl.getElementsByTagNameNS("*", "lvlText")[0];
      const levelText = lvlText
        ? lvlText.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          )
        : "%1.";

      const startNode = lvl.getElementsByTagNameNS("*", "start")[0];
      const start = startNode
        ? parseInt(
            startNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            ) || "1"
          )
        : 1;

      if (ilvl) {
        numberingMap.abstractNums[abstractNumId][ilvl] = {
          format: format,
          levelText: levelText,
          start: start,
        };
      }
    }
  }

  const nums = xmlDoc.getElementsByTagNameNS("*", "num");

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const numId = num.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "numId"
    );
    const abstractNumIdNode = num.getElementsByTagNameNS("*", "abstractNumId")[0];

    if (abstractNumIdNode && numId) {
      const abstractId = abstractNumIdNode.getAttributeNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "val"
      );
      if (abstractId) {
        numberingMap.numToAbstract[numId] = abstractId;
      }
    }
  }


  return numberingMap;
}

/**
 * Build comprehensive NumberingModel from numbering.xml
 * Handles abstractNum definitions, num instances, and start overrides.
 */
export function buildNumberingModel(xmlDoc: Document): NumberingModel {
  const model: NumberingModel = {
    numIdToInst: new Map(),
    abstractLevelDef: new Map(),
  };

  // (1) Parse w:abstractNum definitions
  const abstractNums = xmlDoc.getElementsByTagNameNS("*", "abstractNum");
  for (let i = 0; i < abstractNums.length; i++) {
    const abstractNum = abstractNums[i];
    const abstractNumId = parseInt(
      abstractNum.getAttributeNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "abstractNumId"
      ) || "0"
    );

    const lvls = abstractNum.getElementsByTagNameNS("*", "lvl");
    for (let j = 0; j < lvls.length; j++) {
      const lvl = lvls[j];
      const ilvl = parseInt(
        lvl.getAttributeNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "ilvl"
        ) || "0"
      );

      const numFmtNode = lvl.getElementsByTagNameNS("*", "numFmt")[0];
      const numFmt = numFmtNode
        ? numFmtNode.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          ) || "decimal"
        : "decimal";

      const lvlTextNode = lvl.getElementsByTagNameNS("*", "lvlText")[0];
      const lvlText = lvlTextNode
        ? lvlTextNode.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          ) || "%1."
        : "%1.";

      const startNode = lvl.getElementsByTagNameNS("*", "start")[0];
      const start = startNode
        ? parseInt(
            startNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            ) || "1"
          )
        : 1;

      const key = `${abstractNumId}_${ilvl}`;
      model.abstractLevelDef.set(key, { ilvl, numFmt, lvlText, start });
    }
  }

  // (2) Parse w:num instances with start overrides
  const nums = xmlDoc.getElementsByTagNameNS("*", "num");
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const numId = parseInt(
      num.getAttributeNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "numId"
      ) || "0"
    );

    const abstractNumIdNode = num.getElementsByTagNameNS("*", "abstractNumId")[0];
    if (!abstractNumIdNode) continue;

    const abstractNumId = parseInt(
      abstractNumIdNode.getAttributeNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "val"
      ) || "0"
    );

    const inst: NumInst = {
      numId,
      abstractNumId,
      startOverrideByIlvl: new Map(),
    };

    // Parse lvlOverride/startOverride elements
    const lvlOverrides = num.getElementsByTagNameNS("*", "lvlOverride");
    for (let j = 0; j < lvlOverrides.length; j++) {
      const ov = lvlOverrides[j];
      const ovIlvl = parseInt(
        ov.getAttributeNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "ilvl"
        ) || "0"
      );

      const startOverride = ov.getElementsByTagNameNS("*", "startOverride")[0];
      if (startOverride) {
        const startVal = parseInt(
          startOverride.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          ) || "1"
        );
        inst.startOverrideByIlvl.set(ovIlvl, startVal);
      }
    }

    model.numIdToInst.set(numId, inst);
  }

  return model;
}

// ========================================
// SIGNATURE-BASED LIST RUN MANAGEMENT
// ========================================

/**
 * Compute canonical signature for an abstractNum definition.
 * Lists with matching signatures continue the same sequence regardless of numId.
 */
function computeAbstractSignature(model: NumberingModel, abstractNumId: number): string {
  const triples: string[] = [];
  
  model.abstractLevelDef.forEach((levelDef, key) => {
    const [absId] = key.split('_');
    if (parseInt(absId) === abstractNumId) {
      triples.push(`${levelDef.ilvl}:${levelDef.numFmt}:${levelDef.lvlText}`);
    }
  });
  
  triples.sort();
  return triples.join('|');
}

/**
 * Resolve numId + ilvl to LevelDef with start override applied
 */
function resolveLevel(model: NumberingModel, numId: number, ilvl: number): ResolvedLevel | null {
  const inst = model.numIdToInst.get(numId);
  if (!inst) return null;

  const key = `${inst.abstractNumId}_${ilvl}`;
  const levelDef = model.abstractLevelDef.get(key);
  if (!levelDef) return null;

  let start = levelDef.start;
  if (inst.startOverrideByIlvl.has(ilvl)) {
    start = inst.startOverrideByIlvl.get(ilvl)!;
  }

  return { 
    abstractNumId: inst.abstractNumId, 
    levelDef, 
    start,
    numFmt: levelDef.numFmt,
    lvlText: levelDef.lvlText,
  };
}

/**
 * Determine if we should start a new list run based on signature matching.
 */
function shouldStartNewRun(currentRun: ListRun | null, signature: string): boolean {
  if (!currentRun) return true;
  if (currentRun.signature !== signature) return true;
  return false;
}

/**
 * Update counters for a list run when encountering a new item.
 * - Initialize to start value if null
 * - Otherwise increment
 * - Reset all deeper levels to null
 */
function updateRunCounters(run: ListRun, resolved: ResolvedLevel, ilvl: number): void {
  // Ensure counters array is large enough
  while (run.counters.length <= ilvl) {
    run.counters.push(null);
  }

  // Initialize or increment this level
  if (run.counters[ilvl] === null) {
    run.counters[ilvl] = resolved.start;
  } else {
    run.counters[ilvl]!++;
  }

  // Reset all deeper levels to null (uninitialized)
  for (let k = ilvl + 1; k < run.counters.length; k++) {
    run.counters[k] = null;
  }
}

/**
 * Render the marker string using lvlText template and counter values.
 * Handles %1..%9 placeholders referencing different level counters.
 */
function renderMarker(
  run: ListRun,
  model: NumberingModel,
  abstractNumId: number,
  ilvl: number
): string {
  const key = `${abstractNumId}_${ilvl}`;
  const levelDef = model.abstractLevelDef.get(key);
  if (!levelDef) return '';

  let s = levelDef.lvlText;

  // Bullets are usually encoded directly in lvlText
  if (levelDef.numFmt === 'bullet') {
    return s;
  }

  // Replace %1..%9 placeholders
  for (let k = 1; k <= 9; k++) {
    const placeholder = `%${k}`;
    if (s.includes(placeholder)) {
      const refLevel = k - 1;

      // Ensure counters exist up to refLevel
      while (run.counters.length <= refLevel) {
        run.counters.push(null);
      }

      let val = run.counters[refLevel];
      if (val === null) {
        // Fallback: if referenced level hasn't appeared, treat as 1
        val = 1;
      }

      // Get format for the referenced level
      const refKey = `${abstractNumId}_${refLevel}`;
      const refDef = model.abstractLevelDef.get(refKey);
      const refFmt = refDef ? refDef.numFmt : 'decimal';

      s = s.split(placeholder).join(formatNumber(val, refFmt));
    }
  }

  return s;
}

/**
 * Render full hierarchical section number path 
 * Builds path from level 0 to current ilvl using available counter values.
 */
function renderFullPath(
  run: ListRun,
  model: NumberingModel,
  abstractNumId: number,
  ilvl: number
): string {
  const parts: string[] = [];
  
  for (let level = 0; level <= ilvl; level++) {
    // Check if this level has a counter value
    if (level >= run.counters.length || run.counters[level] === null) {
      // No counter for this level - skip 
      continue;
    }
    
    const val = run.counters[level]!;
    
    // Get format for this level
    const levelKey = `${abstractNumId}_${level}`;
    const levelDef = model.abstractLevelDef.get(levelKey);
    const numFmt = levelDef?.numFmt || 'decimal';
    
    // Skip bullet levels in hierarchical path
    if (numFmt === 'bullet') {
      continue;
    }
    
    parts.push(formatNumber(val, numFmt));
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return parts.join('.') + '.';
}

/**
 * Create a fresh numbering state for tracking list runs
 */
function createNumberingState(): NumberingState {
  return {
    currentRun: null,
    nextRunId: 1,
  };
}

/**
 * Process numbering for a paragraph using signature-based list runs.
 * Returns the section number info or null if not numbered.
 */
function processNumberingWithModel(
  model: NumberingModel,
  state: NumberingState,
  numId: number,
  ilvl: number
): { sectionNumber: string; level: number; format: string } | null {
  const resolved = resolveLevel(model, numId, ilvl);
  if (!resolved) return null;

  const signature = computeAbstractSignature(model, resolved.abstractNumId);

  // Decide whether to start a new list run
  if (shouldStartNewRun(state.currentRun, signature)) {
    state.currentRun = {
      runId: state.nextRunId++,
      signature,
      abstractNumId: resolved.abstractNumId,
      counters: [],
    };
  }

  // Update counters
  updateRunCounters(state.currentRun!, resolved, ilvl);

  // Render marker
  const marker = renderMarker(state.currentRun!, model, resolved.abstractNumId, ilvl);

  // Filter out invalid markers
  const cleaned = marker.replace(/[.\s]+$/, '');
  if (!cleaned || cleaned === '0') {
    return null;
  }

  return {
    sectionNumber: normalizeSectionNumberForMapping(marker),
    level: ilvl,
    format: resolved.levelDef.numFmt,
  };
}

/**
 * Try to extract a decimal section number from the beginning of text.
 * Returns the section number string if found, null otherwise.
 */
function extractSectionNumberFromText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  
  // Match patterns like "1.2.3" or "1.2" or "1." at the start
  const match = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s/);
  if (match) {
    return match[1].replace(/\.$/, '');
  }
  return null;
}

/**
 * Fix section numbers where parent levels OR current level are wrong due to cross-numId issues.
 * 
 * Problem 1: Parent level is 0 (uninitialized counter) - e.g., "0.1." should be "3.1."
 * Problem 2: Parent level is WRONG (different numId has wrong start) - e.g., "16.1." should be "17.1."
 * Problem 3: Parent levels are completely missing - e.g., at ilvl=1, "1." should be "3.1."
 * Problem 4: Current level resets due to different numId - e.g., "2.1" after "2.1.2" should be "2.2"
 */
function fixCrossNumIdNumbering(
  formattedNumber: string,
  globalContext: number[],
  ilvl: number,
  format: string
): string {
  // Only fix decimal hierarchical numbers (like "16.1.")
  if (format !== 'decimal') {
    return formattedNumber;
  }
  
  const cleanNumber = formattedNumber.replace(/\.+$/, '');
  const parts = cleanNumber.split('.');
  const expectedParts = ilvl + 1;
  
  if (parts.length !== expectedParts || expectedParts < 2) {
    return formattedNumber;
  }
  
  let needsFix = false;
  const fixedParts = [...parts];
  
  // Check each PARENT level (all except the last part)
  for (let i = 0; i < fixedParts.length - 1; i++) {
    const partValue = parseInt(fixedParts[i]);
    const contextValue = globalContext[i];
    
    if (contextValue !== undefined && contextValue > 0 && partValue !== contextValue) {
      fixedParts[i] = contextValue.toString();
      needsFix = true;
    }
  }

  // Check CURRENT level (the last part)
  const currentLevelIdx = fixedParts.length - 1;
  const currentPartValue = parseInt(fixedParts[currentLevelIdx]);
  const currentContextValue = globalContext[currentLevelIdx];

  if (currentContextValue !== undefined && currentContextValue > 0) {
    let parentsMatch = true;
    for (let i = 0; i < currentLevelIdx; i++) {
      if (parseInt(fixedParts[i]) !== globalContext[i]) {
        parentsMatch = false;
        break;
      }
    }

    if (parentsMatch && currentPartValue <= currentContextValue) {
      const newValue = currentContextValue + 1;
      fixedParts[currentLevelIdx] = newValue.toString();
      needsFix = true;
    }
  }
  
  if (needsFix) {
    const suffix = formattedNumber.endsWith('.') ? '.' : '';
    return fixedParts.join('.') + suffix;
  }
  
  return formattedNumber;
}

/**
 * Parse a section number string into an array of numeric values.
 * E.g., "2.3.1" -> [2, 3, 1], "1.2" -> [1, 2]
 */
function parseSectionNumberString(sectionNum: string): number[] {
  if (!sectionNum) return [];
  const cleaned = sectionNum.trim().replace(/\.$/, '');
  const parts = cleaned.split('.');
  const result: number[] = [];
  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num)) {
      result.push(num);
    }
  }
  return result;
}

/**
 * Check if a paragraph element is inside a table cell.
 * Used to skip table cell content when tracking numbering context,
 * since numbers in tables should not affect section numbering.
 */
function isParentTableCell(element: Element): boolean {
  let parent = element.parentNode as Element | null;
  while (parent) {
    // Check for table cell element (w:tc)
    if (parent.localName === 'tc' || parent.nodeName === 'w:tc') {
      return true;
    }
    // Stop at document body
    if (parent.localName === 'body' || parent.nodeName === 'w:body') {
      return false;
    }
    parent = parent.parentNode as Element | null;
  }
  return false;
}

/**
 * Get the current <w:numPr> element from a paragraph, excluding any inside <w:pPrChange>.
 * <w:pPrChange> contains the OLD paragraph properties before a tracked change,
 * so <w:numPr> inside it represents REMOVED numbering, not current numbering.
 */

function getCurrentNumPr(para: Element): Element | null {
  const pPr = para.getElementsByTagNameNS("*", "pPr")[0];
  if (!pPr) return null;
  
  // Look for direct child numPr of pPr, not inside pPrChange
  const children = pPr.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      if (localName === 'numPr') {
        return el;
      }
    }
  }
  return null;
}

/**
 * Get the OLD <w:numPr> element from inside <w:pPrChange> (if any).
 * This represents numbering that was REMOVED via track changes.
 * Used to count deleted numbered paragraphs in original/combined structures.
 */
function getDeletedNumPr(para: Element): Element | null {
  const pPr = para.getElementsByTagNameNS("*", "pPr")[0];
  if (!pPr) return null;
  
  const pPrChange = pPr.getElementsByTagNameNS("*", "pPrChange")[0];
  if (!pPrChange) return null;
  
  // Only return old numPr if current pPr has NO numPr (i.e., numbering was deleted)
  const currentNumPr = getCurrentNumPr(para);
  if (currentNumPr) return null;  // Numbering still exists, not deleted
  
  const oldNumPr = pPrChange.getElementsByTagNameNS("*", "numPr")[0];
  return oldNumPr || null;
}

/**
 * Check if a paragraph's numbering/properties are deleted (not just its content).
 * When <w:del> appears inside <w:pPr><w:rPr>, the entire paragraph including its
 * section number is marked for deletion.
 */
/**
 * Check if a paragraph's numbering/properties are deleted (not just its content).
 * Two mechanisms Word uses:
 * 1. <w:del> appears inside <w:pPr><w:rPr>
 * 2. <w:pPrChange> contains old <w:numPr> but current <w:pPr> has no <w:numPr>
 */
function isParagraphNumberingDeleted(para: Element): boolean {
  const pPr = para.getElementsByTagNameNS("*", "pPr")[0];
  if (!pPr) return false;
  
  // Method 1: Check for <w:del> inside <w:pPr><w:rPr>
  const rPr = pPr.getElementsByTagNameNS("*", "rPr")[0];
  if (rPr) {
    const del = rPr.getElementsByTagNameNS("*", "del")[0];
    if (del) return true;
  }
  
  // Method 2: Check if <w:pPrChange> had <w:numPr> but current <w:pPr> doesn't
  const pPrChange = pPr.getElementsByTagNameNS("*", "pPrChange")[0];
  if (pPrChange) {
    // Check if old properties had numPr
    const oldNumPr = pPrChange.getElementsByTagNameNS("*", "numPr")[0];
    if (oldNumPr) {
      // Check if current pPr has numPr (using getCurrentNumPr which excludes pPrChange)
      const currentNumPr = getCurrentNumPr(para);
      if (!currentNumPr) {
        // Numbering was removed via track changes
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract text from a paragraph, preserving tabs as spaces.
 * Iterates through runs in document order to maintain proper text sequence.
 * Preserves word boundaries even when track change content is skipped.
 * @param para - The paragraph element
 * @param mode - Extraction mode: 'amended' (default), 'original', or 'combined'
 */
function extractTextFromParagraph(para: Element, mode: OOXMLExtractionMode = 'amended'): string {
  let result = "";
  const runs = para.getElementsByTagNameNS("*", "r");
  let skippedContentHadSpace = false;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    let shouldSkip = false;
    if (mode === 'amended') {
      shouldSkip = isInsideDeletion(run);
    } else if (mode === 'original') {
      shouldSkip = isInsideInsertion(run);
    }
    // mode === 'combined': shouldSkip stays false, include everything

    let runText = "";
    const children = run.childNodes;
    for (let j = 0; j < children.length; j++) {
      const child = children[j];

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        // Handle both with and without namespace prefix
        const localName = element.localName || element.nodeName.replace(/^w:/, '');

        if (localName === "t") {
          runText += element.textContent || "";
        } else if (localName === "delText") {
          // Include deleted text in original mode AND combined mode
          if (mode === 'original' || mode === 'combined') {
            runText += element.textContent || "";
          }
        } else if (localName === "tab") {
          runText += " ";
        } else if (localName === "br") {
          runText += " ";
        }
      }
    }

    if (shouldSkip) {
      if (runText.length > 0 && /\s/.test(runText)) {
        skippedContentHadSpace = true;
      }
      continue;
    }

    if (skippedContentHadSpace && 
        result.length > 0 && 
        !/\s$/.test(result) && 
        runText.length > 0 && 
        !/^\s/.test(runText)) {
      result += " ";
    }
    skippedContentHadSpace = false;

    result += runText;
  }
 
  return result;
}

/**
 * Extract text from paragraph with track change offset tracking.
 * Traverses in document order, tracking position for both <w:t> and <w:delText>.
 * Records offset ranges for text inside <w:ins> and <w:del>.
 * 
 * @returns Combined text and array of track changes with offsets
 */
function extractTextWithTrackChangeOffsets(para: Element): {
  combinedText: string;
  trackChanges: ParagraphTrackChange[];
} {
  let combinedText = '';
  let currentOffset = 0;
  const trackChanges: ParagraphTrackChange[] = [];
  
  // We need to traverse in document order, handling ins/del wrappers
  // Walk through all child nodes of the paragraph
  const walker = document.createTreeWalker(
    para,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: Element) => {
        const localName = node.localName || node.nodeName.replace(/^w:/, '');
        // Accept runs, text elements, and track change wrappers
        if (['r', 't', 'delText', 'ins', 'del', 'tab', 'br'].includes(localName)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  // Track current ins/del context
  let currentIns: { author?: string; date?: string; startOffset: number; text: string } | null = null;
  let currentDel: { author?: string; date?: string; startOffset: number; text: string } | null = null;

  // Simple approach: iterate through runs in order
  const runs = para.getElementsByTagNameNS("*", "r");
  
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const isInInsertion = isInsideInsertion(run);
    const isInDeletion = isInsideDeletion(run);
    
    // Get ins/del element for metadata if applicable
    let insElement: Element | null = null;
    let delElement: Element | null = null;
    if (isInInsertion) {
      insElement = findAncestorByName(run, 'ins');
    }
    if (isInDeletion) {
      delElement = findAncestorByName(run, 'del');
    }
    
    const children = run.childNodes;
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      
      const element = child as Element;
      const localName = element.localName || element.nodeName.replace(/^w:/, '');
      
      let textContent = '';
      if (localName === 't') {
        textContent = element.textContent || '';
      } else if (localName === 'delText') {
        textContent = element.textContent || '';
      } else if (localName === 'tab' || localName === 'br') {
        textContent = ' ';
      }
      
      if (!textContent) continue;
      
      const startOffset = currentOffset;
      const endOffset = currentOffset + textContent.length;
      
      // Record track change if inside ins or del
      if (isInInsertion && localName === 't') {
        trackChanges.push({
          type: 'insertion',
          text: textContent,
          startOffset,
          endOffset,
          author: insElement?.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "author"
          ) || insElement?.getAttribute('w:author') || undefined,
          date: insElement?.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "date"
          ) || insElement?.getAttribute('w:date') || undefined,
        });
      }
      
      if (isInDeletion || localName === 'delText') {
        trackChanges.push({
          type: 'deletion',
          text: textContent,
          startOffset,
          endOffset,
          author: delElement?.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "author"
          ) || delElement?.getAttribute('w:author') || undefined,
          date: delElement?.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "date"
          ) || delElement?.getAttribute('w:date') || undefined,
        });
      }
      
      combinedText += textContent;
      currentOffset = endOffset;
    }
  }
  
  // Merge adjacent track changes of same type (from same ins/del element)
  const mergedChanges = mergeAdjacentTrackChanges(trackChanges);
  
  return { combinedText, trackChanges: mergedChanges };
}

/**
 * Find ancestor element by local name
 */
function findAncestorByName(node: Node, name: string): Element | null {
  let current = node.parentNode;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      if (localName === name) {
        return el;
      }
    }
    current = current.parentNode;
  }
  return null;
}

/**
 * Merge adjacent track changes of the same type into single entries
 */
function mergeAdjacentTrackChanges(changes: ParagraphTrackChange[]): ParagraphTrackChange[] {
  if (changes.length === 0) return [];
  
  const merged: ParagraphTrackChange[] = [];
  let current = { ...changes[0] };
  
  for (let i = 1; i < changes.length; i++) {
    const next = changes[i];
    // Merge if same type and adjacent
    if (next.type === current.type && next.startOffset === current.endOffset) {
      current.text += next.text;
      current.endOffset = next.endOffset;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  
  return merged;
}

/**
 * Extract text from paragraph as tokens with track change status.
 * Preserves document order and allows sentence segmentation on original text.
 */
export function extractTokensFromParagraph(para: Element): TextToken[] {
  const tokens: TextToken[] = [];
  const runs = para.getElementsByTagNameNS("*", "r");

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const isDeleted = isInsideDeletion(run);
    const isInserted = isInsideInsertion(run);
    
    const children = run.childNodes;
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      
      const element = child as Element;
      const localName = element.localName || element.nodeName.replace(/^w:/, '');
      
      let text = '';
      if (localName === 't') {
        text = element.textContent || '';
      } else if (localName === 'delText') {
        text = element.textContent || '';
      } else if (localName === 'tab' || localName === 'br') {
        text = ' ';
      }
      
      if (!text) continue;
      
      let status: TextToken['status'] = 'unchanged';
      if (isDeleted || localName === 'delText') {
        status = 'deleted';
      } else if (isInserted) {
        status = 'inserted';
      }
      
      // Merge adjacent tokens of same status
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && lastToken.status === status) {
        lastToken.text += text;
      } else {
        tokens.push({ text, status });
      }
    }
  }
  
  return tokens;
}

/**
 * Extract tokens from paragraph with absolute document offsets
 */
export function extractTokensFromParagraphWithOffsets(
  para: Element,
  startingOffset: number
): { tokens: TextToken[]; newOffset: number } {
  const tokens: TextToken[] = [];
  let currentOffset = startingOffset;
  
  // Walk through all runs in the paragraph
  const runs = para.getElementsByTagNameNS("*", "r");
  
  for (const run of Array.from(runs)) {
    // Check if this run is inside a deletion or insertion
    const isDeleted = !!run.closest('del');
    const isInserted = !!run.closest('ins');
    const status: 'unchanged' | 'inserted' | 'deleted' = 
      isDeleted ? 'deleted' : isInserted ? 'inserted' : 'unchanged';
    
    // Get text elements (w:t for normal/inserted, w:delText for deleted)
    const textElements = isDeleted 
      ? run.getElementsByTagNameNS("*", "delText")
      : run.getElementsByTagNameNS("*", "t");
    
    for (const textEl of Array.from(textElements)) {
      const text = textEl.textContent || '';
      if (!text) continue;
      
      tokens.push({
        text,
        status,
        startOffset: currentOffset,
        endOffset: currentOffset + text.length,
      });
      
      currentOffset += text.length;
    }
  }
  
  // Account for paragraph separator
  currentOffset += 1;
  
  return { tokens, newOffset: currentOffset };
}

/**
 * Build original text from tokens (unchanged + deleted)
 */
export function buildOriginalFromTokens(tokens: TextToken[]): string {
  return tokens
    .filter(t => t.status === 'unchanged' || t.status === 'deleted')
    .map(t => t.text)
    .join('');
}

/**
 * Build amended text from tokens (unchanged + inserted)
 */
export function buildAmendedFromTokens(tokens: TextToken[]): string {
  return tokens
    .filter(t => t.status === 'unchanged' || t.status === 'inserted')
    .map(t => t.text)
    .join('');
}

/**
 * Extract text from OOXML document
 * @param xmlDoc - The parsed XML document
 * @param numberingMap - Optional pre-built numbering map (for uploaded documents)
 * @param mode - Extraction mode: 'amended' (include insertions) or 'original' (include deletions)
 */
export function extractTextFromOOXML(
  xmlDoc: Document, 
  numberingMap?: any,
  mode: OOXMLExtractionMode = 'amended'
): string {
  const textParts: string[] = [];
  
  // If no numbering map provided, build it from the document
  const numMap = numberingMap || buildNumberingMap(xmlDoc);
  
  const listCounters: { [key: string]: number } = {};
  const paragraphs = xmlDoc.getElementsByTagNameNS("*", "p");

  // Maintain a global section path context from DECIMAL section numbers only
  // This helps when different numIds are used for different levels
  let globalDecimalContext: number[] = [];

  // Track full section path including ALL formats (decimal, letter, roman)
  // Used for non-decimal continuation decisions across different numIds
  let globalFullContext: string[] = [];
  
  // Track non-decimal counters per parent context
  // Key: `${ilvl}_${format}_${parentContext}`, Value: last counter value in that context
  // parentContext combines non-decimal ancestors + decimal ancestors to uniquely identify
  // which section of the document we're under
  const nonDecimalPerParent: Map<string, number> = new Map();

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];

    // Extract text preserving tabs as spaces
    let actualText = extractTextFromParagraph(para, mode);

    if (!actualText.trim()) {
      continue;
    }

    // Skip all numbering logic for paragraphs inside table cells
    // Table content is treated as plain text - numbers in tables should not affect section numbering
    if (isParentTableCell(para)) {
      textParts.push(actualText);
      continue;
    }

    let paraText = "";
    const numPr = getCurrentNumPr(para);

    if (numPr) {
      const ilvlNode = numPr.getElementsByTagNameNS("*", "ilvl")[0];
      const level = ilvlNode
        ? parseInt(
            ilvlNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            ) || "0"
          )
        : 0;

      const numIdNode = numPr.getElementsByTagNameNS("*", "numId")[0];
      const numId = numIdNode
        ? numIdNode.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          )
        : null;

      if (numId) {
        const counterKey = `${numId}_${level}`;
        
        // Get format for this level
        const abstractNumId = numMap.numToAbstract[numId];
        let levelFormat = 'decimal';
        if (abstractNumId && numMap.abstractNums[abstractNumId]?.[level]) {
          levelFormat = numMap.abstractNums[abstractNumId][level].format;
        }
        
        // Initialize this level AND all parent levels with their START values
        if (!listCounters[counterKey]) {
          for (let initLevel = 0; initLevel <= level; initLevel++) {
            const initKey = `${numId}_${initLevel}`;
            if (!listCounters[initKey]) {
              // Get START value from numbering definition
              const startValue =
                (abstractNumId &&
                  numMap.abstractNums[abstractNumId]?.[initLevel]?.start) ||
                1;
              listCounters[initKey] = startValue - 1; // Will increment to startValue
            }
          }
        }

        listCounters[counterKey]++;

        for (let resetLevel = level + 1; resetLevel < 10; resetLevel++) {
          const resetKey = `${numId}_${resetLevel}`;
          listCounters[resetKey] = 0;
        }

        const numFormat = getNumberingFormat(numMap, numId, level, listCounters);
        let formattedNumber = numFormat.fullText;

        // console.log(`OOXML: ilvl=${level}, numId=${numId}, format=${levelFormat}, raw="${formattedNumber}"`);

        // Only apply cross-numId fix for decimal hierarchical numbers
        // For letters/romans, we DON'T want to "continue" from previous numIds
        // Fix cross-numId issues for DECIMAL numbers
        if (levelFormat === 'decimal') {
          if (level === 0) {
            // For top-level sections (level=0), fix when a different numId gives wrong counter
            const parsedValue = parseInt(formattedNumber.replace(/\.$/, ''));
            const contextValue = globalDecimalContext[0];
            if (!isNaN(parsedValue) && contextValue !== undefined && parsedValue <= contextValue) {
              const fixedValue = contextValue + 1;
              const suffix = formattedNumber.endsWith('.') ? '.' : '';
              // console.log(`  Fixed top-level cross-numId: "${formattedNumber}" -> "${fixedValue}${suffix}" (context[0]=${contextValue})`);
              formattedNumber = fixedValue + suffix;
            }
          } else {
            // For sub-levels (level > 0), fix parent levels AND current level that are wrong
            formattedNumber = fixCrossNumIdNumbering(formattedNumber, globalDecimalContext, level, levelFormat);
          }
        }

        if (levelFormat !== 'decimal') {
          const rawValue = listCounters[counterKey];
          
          // Build parent context from BOTH non-decimal ancestors AND decimal context
          // This ensures letter/roman lists restart when ANY parent changes
          const nonDecimalAncestors = globalFullContext.slice(0, level).join('.');
          const decimalAncestors = globalDecimalContext.join('.');
          const currentParentContext = `${nonDecimalAncestors}|${decimalAncestors}`;
          
          // Create tracking key that includes parent context
          const perParentKey = `${level}_${levelFormat}_${currentParentContext}`;
          const lastValueInParent = nonDecimalPerParent.get(perParentKey);
          
          let adjustedValue: number;
          
          if (rawValue === 1) {
            // Word says this is a restart - trust it
            adjustedValue = 1;
          } else if (lastValueInParent === undefined) {
            // First time seeing this parent context - use Word's value
            adjustedValue = rawValue;
          } else if (rawValue <= lastValueInParent) {
            // Word's counter is behind or equal to our tracking
            // This means Word incorrectly continued from a previous list - fix it
            adjustedValue = lastValueInParent + 1;
          } else {
            // Word's counter is ahead - valid continuation, use it
            adjustedValue = rawValue;
          }
          
          // Update tracking for this parent context
          nonDecimalPerParent.set(perParentKey, adjustedValue);
          
          // Reformat if we adjusted
          if (adjustedValue !== rawValue) {
            const suffix = formattedNumber.match(/[.\s]*$/)?.[0] || '';
            formattedNumber = formatNumber(adjustedValue, levelFormat) + suffix;
          }
        }
        
        // console.log(`OOXML: after fix="${formattedNumber}"`);

        // Filter out invalid section numbers like "0." - treat as unnumbered paragraph
        const cleanedNumber = formattedNumber.replace(/[.\s]+$/, '');
        if (cleanedNumber === '0' || cleanedNumber === '') {
          // Don't add numbering - treat as regular paragraph
          paraText = "";
        } else {
          const indent = level > 0 ? "  ".repeat(level) : "";
          paraText = indent + formattedNumber + " ";
        }

        // Only update global DECIMAL context with decimal numbers
        // Ignore invalid section numbers like "0." which can corrupt the context
        if (levelFormat === 'decimal') {
          const parsedNum = parseSectionNumberString(formattedNumber);
          if (parsedNum.length > 0 && parsedNum[0] > 0) {
            // Update context up to this level
            for (let l = 0; l < parsedNum.length; l++) {
              globalDecimalContext[l] = parsedNum[l];
            }
            // Trim context to current depth
            globalDecimalContext.length = parsedNum.length;
            // console.log(`  Context updated: level=${level}, format=${levelFormat}, value=${parsedNum.join('.')}`);
          }
        }
        
        // Update full context for ALL formats (used for non-decimal continuation)
        // This tracks letters, romans, etc. so we know when parent changes
        const sectionNumForContext = formattedNumber.replace(/[.\s]+$/, '');
        if (sectionNumForContext && sectionNumForContext !== '0') {
          globalFullContext[level] = sectionNumForContext;
          globalFullContext.length = level + 1;
        }
      }
    } else {
      // No auto-numbering - check if this paragraph starts with a manual section number
      const manualSectionNum = extractSectionNumberFromText(actualText);
      if (manualSectionNum) {
        const parsedNum = parseSectionNumberString(manualSectionNum);
        if (parsedNum.length > 0) {
          // Update global context with manually-typed section number
          for (let l = 0; l < parsedNum.length; l++) {
            globalDecimalContext[l] = parsedNum[l];
          }
          globalDecimalContext.length = parsedNum.length;
        }
      }
    }

    paraText += actualText;
    textParts.push(paraText);
  }

  return textParts.join("\n");
}

/**
 * Get numbering format for a specific list item
 */
function getNumberingFormat(
  numberingMap: any,
  numId: string,
  level: number,
  listCounters: { [key: string]: number }
): { fullText: string } {
  const abstractNumId = numberingMap.numToAbstract[numId];

  let levelText = "";

  if (
    abstractNumId &&
    numberingMap.abstractNums[abstractNumId] &&
    numberingMap.abstractNums[abstractNumId][level]
  ) {
    const levelDef = numberingMap.abstractNums[abstractNumId][level];
    levelText = levelDef.levelText;
  } else {
    levelText = "%1.";
  }

  let fullText = levelText;
  const placeholderRegex = /%(\d+)/g;
  let match;
  const replacements: Array<{ placeholder: string; level: number }> = [];

  while ((match = placeholderRegex.exec(levelText)) !== null) {
    const placeholderLevel = parseInt(match[1]) - 1;
    replacements.push({
      placeholder: match[0],
      level: placeholderLevel,
    });
  }

  for (const replacement of replacements) {
    const counterKey = `${numId}_${replacement.level}`;
    const counterValue = listCounters[counterKey] || 0;

    let levelFormat = "decimal";
    if (
      abstractNumId &&
      numberingMap.abstractNums[abstractNumId] &&
      numberingMap.abstractNums[abstractNumId][replacement.level]
    ) {
      levelFormat = numberingMap.abstractNums[abstractNumId][replacement.level].format;
    }

    const formattedNum = formatNumber(counterValue, levelFormat);
    fullText = fullText.replace(replacement.placeholder, formattedNum);
  }

  return { fullText: fullText };
}

/**
 * Check if a node is inside a deletion (track changes)
 */
function isInsideDeletion(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      if (localName === "del") {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}

/**
 * Check if a node is inside an insertion (track changes)
 */
function isInsideInsertion(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      if (localName === "ins") {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}

/**
 * Extraction mode for OOXML text
 * - 'amended': Include insertions, exclude deletions (current/accepted state)
 * - 'original': Include deletions, exclude insertions (original state before changes)
 * - 'combined': Include BOTH insertions and deletions (for unified sentence boundary detection)
 */
export type OOXMLExtractionMode = 'amended' | 'original' | 'combined';

/**
 * Format a number according to the specified format type
 */
function formatNumber(num: number, format: string): string {
  switch (format) {
    case "decimal":
      return num.toString();
    case "upperRoman":
      return toRoman(num).toUpperCase();
    case "lowerRoman":
      return toRoman(num).toLowerCase();
    case "upperLetter":
      return toLetter(num).toUpperCase();
    case "lowerLetter":
      return toLetter(num).toLowerCase();
    case "ordinal":
      return num + getOrdinalSuffix(num);
    case "bullet":
      return "•";
    default:
      return num.toString();
  }
}

/**
 * Convert number to Roman numerals
 */
function toRoman(num: number): string {
  const romanNumerals: [string, number][] = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];

  let result = "";
  for (const [roman, value] of romanNumerals) {
    while (num >= value) {
      result += roman;
      num -= value;
    }
  }
  return result;
}

/**
 * Convert number to letter (a, b, c, ... z, aa, ab, ...)
 */
function toLetter(num: number): string {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(97 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, ...)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

// ========================================
// OOXML PARAGRAPH-TO-SECTION MAPPING 
// ========================================

export interface OOXMLParagraphSectionMapping {
  ooxmlIndex: number;           // Original index in <w:p> sequence
  sectionNumber: string | null; // Section this paragraph belongs to
  text: string;                 // Text content (for debugging)
}

/**
 * Represents a single non-empty OOXML paragraph with parsed metadata.
 * Used for structure parsing that preserves paragraph indices.
 */
export interface OOXMLParagraph {
  index: number;
  text: string;           // Amended text (insertions included, deletions excluded)
  originalText: string;   // Original text (deletions included, insertions excluded)
  combinedText: string;   // Combined text (both insertions AND deletions included)
  trackChanges: ParagraphTrackChange[];
  combinedTextLength: number;
  numbering: {
    sectionNumber: string;
    level: number;
    format: string;
  } | null;
  originalNumbering: {       
    sectionNumber: string;
    level: number;
    format: string;
  } | null;
  combinedNumbering: {    // Stable numbering for section attribution
    sectionNumber: string;
    level: number;
    format: string;
  } | null;
  // Unified numbering system
  unifiedNumbering: {
    internalSectionNumber: string;      // Unique ID for tree building (counts ALL paragraphs)
    rawSectionMarker: string;         // Actual marker in document
    originalDisplayNumber: string | null; // Display in original (unchanged + deleted)
    amendedDisplayNumber: string | null;  // Display in amended (unchanged + inserted)
    level: number;
    format: string;
  } | null;
  // Raw numPr info for deferred numbering computation (Stage 1)
  rawNumPr: {
    numId: number;
    ilvl: number;
    isDeleted: boolean;  // true if numPr was inside pPrChange (numbering removed)
  } | null;
  // Manual section marker extracted from text (if no numPr)
  manualMarker: ParsedManualMarker | null;
  paragraphStatus: 'unchanged' | 'inserted' | 'deleted';
  isTableCell: boolean;
}

/**
 * Track change occurrence within a paragraph with offset info
 */
export interface ParagraphTrackChange {
  type: 'insertion' | 'deletion';
  text: string;
  startOffset: number;  // 0-indexed within paragraph
  endOffset: number;    // exclusive
  author?: string;
  date?: string;
}

/**
 * Extended paragraph info with track change offsets
 */
export interface OOXMLParagraphWithOffsets extends OOXMLParagraph {
  trackChanges: ParagraphTrackChange[];
  combinedTextLength: number;  // Total length of combined text (for offset calculations)
}

/**
 * State for unified numbering system.
 * Uses PERSISTENT counters that survive across all paragraphs.
 * Counters[ilvl] tracks the current value for each level.
 * Uses most recent abstractNumId for format lookup.
 */
interface UnifiedNumberingState {
  combinedCounters: (number | null)[];   // Counts ALL paragraphs
  originalCounters: (number | null)[];   // Counts unchanged + deleted
  amendedCounters: (number | null)[];    // Counts unchanged + inserted
  lastAbstractNumId: number | null;      // For format lookup
}

/**
 * Path component for tracking full section path with AbstractNumId-based logic.
 * Each level in the path tracks its numbering metadata and positions.
 */
interface PathLevelComponent {
  abstractNumId: number;
  ilvl: number;               // ilvl from XML (may restart at 0 for child lists)
  numFmt: string;             // decimal, upperLetter, lowerLetter, upperRoman, lowerRoman
  combinedPosition: number;   // Position in combined structure (counts all)
  originalPosition: number | null;  // Position in original (null if inserted)
  amendedPosition: number | null;   // Position in amended (null if deleted)
}

/**
 * State for path-based unified numbering.
 * Tracks the full path from root to current position.
 * Uses running counters per level to correctly handle gaps from insertions/deletions.
 */
interface PathBasedNumberingState {
  path: PathLevelComponent[];
  topLevelAbstractNumId: number | null;
  seenAbstractNumIdsPerTopLevel: Map<string, Set<number>>;
  // Running counters per level, keyed by parent context + abstractNumId + ilvl
  levelCounters: Map<string, {
    combined: number;
    original: number;
    amended: number;
  }>;
}

/**
 * Parsed manual marker with format and value
 */
interface ParsedManualMarker {
  rawMarker: string;
  format: string;      // decimal, lowerLetter, upperLetter, lowerRoman, upperRoman
  value: number;
  hasParens: boolean;  // (a) vs a)
}

/**
 * Parse a manual section marker to determine its format and numeric value.
 * Handles: decimal (1, 2, 3), letters (a, b, A, B), roman (i, ii, iii, I, II)
 */
function parseManualMarker(marker: string): ParsedManualMarker | null {
  if (!marker) return null;
  
  const trimmed = marker.trim().replace(/\.+$/, '');
  
  // Full parens: (1), (a), (i)
  const fullParenMatch = trimmed.match(/^\(([^)]+)\)$/);
  if (fullParenMatch) {
    const inner = fullParenMatch[1];
    const parsed = parseInnerMarker(inner);
    if (parsed) {
      return { ...parsed, rawMarker: marker, hasParens: true };
    }
  }
  
  // Close paren only: 1), a), i)
  const closeParenMatch = trimmed.match(/^([^)]+)\)$/);
  if (closeParenMatch) {
    const inner = closeParenMatch[1];
    const parsed = parseInnerMarker(inner);
    if (parsed) {
      return { ...parsed, rawMarker: marker, hasParens: true };
    }
  }
  
  // No parens: 1, 1., a, a., i, i.
  const plainMatch = trimmed.match(/^([^.()]+)\.?$/);
  if (plainMatch) {
    const inner = plainMatch[1];
    const parsed = parseInnerMarker(inner);
    if (parsed) {
      return { ...parsed, rawMarker: marker, hasParens: false };
    }
  }
  
  // Hierarchical decimal: 1.2.3
  const hierarchicalMatch = trimmed.match(/^(\d+(?:\.\d+)+)\.?$/);
  if (hierarchicalMatch) {
    // For hierarchical, extract the last component's value
    const parts = hierarchicalMatch[1].split('.');
    const lastValue = parseInt(parts[parts.length - 1]);
    return {
      rawMarker: marker,
      format: 'decimal',
      value: lastValue,
      hasParens: false,
    };
  }
  
  return null;
}

/**
 * Parse the inner content of a marker (without parens/dots)
 */
function parseInnerMarker(inner: string): { format: string; value: number } | null {
  const trimmed = inner.trim();
  
  // Decimal
  if (/^\d+$/.test(trimmed)) {
    return { format: 'decimal', value: parseInt(trimmed) };
  }
  
  // Single letter
  if (/^[a-z]$/i.test(trimmed)) {
    const isLower = trimmed === trimmed.toLowerCase();
    const value = trimmed.toLowerCase().charCodeAt(0) - 96; // a=1, b=2, etc.
    return { 
      format: isLower ? 'lowerLetter' : 'upperLetter', 
      value 
    };
  }
  
  // Roman numeral (validate it's actually roman, not just letters)
  if (/^[ivxlcdm]+$/i.test(trimmed)) {
    const value = romanToArabic(trimmed.toLowerCase());
    if (value > 0 && value <= 50) { // Reasonable limit for section numbers
      const isLower = trimmed === trimmed.toLowerCase();
      return { 
        format: isLower ? 'lowerRoman' : 'upperRoman', 
        value 
      };
    }
  }
  
  return null;
}

/**
 * Convert roman numeral to arabic number
 */
function romanToArabic(roman: string): number {
  const map: { [key: string]: number } = { 
    i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 
  };
  let result = 0;
  const lower = roman.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const current = map[lower[i]] || 0;
    const next = map[lower[i + 1]] || 0;
    result += (next > current) ? -current : current;
  }
  return result;
}

/**
 * Check if two formats are compatible for sibling relationship.
 * Manual markers can be siblings of OOXML markers with same logical format.
 */
function formatsAreCompatible(format1: string, format2: string): boolean {
  // Direct match
  if (format1 === format2) return true;
  
  // Normalize - OOXML uses slightly different names
  const normalize = (f: string) => {
    if (f === 'decimal') return 'decimal';
    if (f === 'lowerLetter' || f === 'upperLetter') return 'letter';
    if (f === 'lowerRoman' || f === 'upperRoman') return 'roman';
    return f;
  };
  
  return normalize(format1) === normalize(format2);
}

/**
 * Find a path component with compatible format, searching from end.
 * Returns index in path or -1 if not found.
 */
function findPathComponentByFormat(
  path: PathLevelComponent[],
  format: string
): number {
  for (let i = path.length - 1; i >= 0; i--) {
    if (formatsAreCompatible(path[i].numFmt, format)) {
      return i;
    }
  }
  return -1;
}

/**
 * Process a manual (plaintext) section number using path-based algorithm.
 * Borrows metadata (abstractNumId, ilvl) from existing path items when possible.
 * 
 * Rules:
 * 1. Find path component with same format
 * 2. If found AND value > existing: Sibling (borrow metadata, replace in path)
 * 3. If found AND value == 1: Could be new child list or restart - check context
 * 4. If not found: New child (use synthetic abstractNumId)
 */
function processManualPathBasedNumbering(
  state: PathBasedNumberingState,
  parsedMarker: ParsedManualMarker,
  paragraphStatus: 'unchanged' | 'inserted' | 'deleted'
): {
  internalSectionNumber: string;
  rawSectionMarker: string;
  originalDisplayNumber: string | null;
  amendedDisplayNumber: string | null;
  level: number;
} | null {
  
  const { format, value, rawMarker } = parsedMarker;
  
  // Use negative abstractNumIds for manual markers (won't collide with real ones)
  const syntheticAbstractNumId = -1000 - formatToSyntheticId(format);
  
  let parentPath: PathLevelComponent[] = [];
  let insertionType: 'sibling' | 'child' = 'child';
  let borrowedAbstractNumId: number = syntheticAbstractNumId;
  let borrowedIlvl: number = 0;
  
  if (state.path.length === 0) {
    // First section - start new path
    insertionType = 'child';
    parentPath = [];
  } else {
    // Search for component with same format
    const matchIndex = findPathComponentByFormat(state.path, format);
    
    if (matchIndex !== -1) {
      const matchedComponent = state.path[matchIndex];
      
      // Borrow metadata from matched component
      borrowedAbstractNumId = matchedComponent.abstractNumId;
      borrowedIlvl = matchedComponent.ilvl;
      
      // Check if this is a valid sibling (value > existing)
      if (value > matchedComponent.combinedPosition) {
        // Sibling - replace matched component and discard everything after
        insertionType = 'sibling';
        parentPath = state.path.slice(0, matchIndex);
      } else if (value === 1) {
        // Value is 1 - likely a new child list with same format
        insertionType = 'child';
        parentPath = [...state.path];
        borrowedIlvl = matchedComponent.ilvl + 1; // Increment ilvl for child
      } else {
        // Value doesn't fit - treat as new child anyway
        insertionType = 'child';
        parentPath = [...state.path];
      }
    } else {
      // No matching format - new child list
      insertionType = 'child';
      parentPath = [...state.path];
    }
  }
  
  // Get or create counters for this level
  const counters = getOrCreateLevelCounters(
    state, 
    parentPath, 
    borrowedAbstractNumId, 
    borrowedIlvl
  );
  
  // For manual markers, we set the counter to the explicit value
  // (rather than incrementing, since we know the exact value)
  counters.combined = value;
  if (paragraphStatus !== 'inserted') {
    counters.original = value;
  }
  if (paragraphStatus !== 'deleted') {
    counters.amended = value;
  }
  
  // Build new path component
  const newComponent: PathLevelComponent = {
    abstractNumId: borrowedAbstractNumId,
    ilvl: borrowedIlvl,
    numFmt: format,
    combinedPosition: value,
    originalPosition: paragraphStatus !== 'inserted' ? value : null,
    amendedPosition: paragraphStatus !== 'deleted' ? value : null,
  };
  
  // Build new path
  const newPath = [...parentPath, newComponent];
  
  // Update state
  state.path = newPath;
  
  // Update top-level tracking if this is a new top level
  if (newPath.length === 1) {
    state.topLevelAbstractNumId = borrowedAbstractNumId;
    const topKey = getTopLevelKey(newPath);
    if (!state.seenAbstractNumIdsPerTopLevel.has(topKey)) {
      state.seenAbstractNumIdsPerTopLevel.set(topKey, new Set([borrowedAbstractNumId]));
    }
  }
  
  // Render section numbers
  const internalSectionNumber = renderSectionNumberFromPath(newPath, 'combined') || '';
  const originalDisplayNumber = renderSectionNumberFromPath(newPath, 'original');
  const amendedDisplayNumber = renderSectionNumberFromPath(newPath, 'amended');
  
  console.log(`[PATH-MANUAL] format=${format} value=${value} type=${insertionType}`);
  console.log(`[PATH-MANUAL]   path=[${newPath.map(p => `${p.numFmt}:${p.combinedPosition}`).join(',')}]`);
  console.log(`[PATH-MANUAL]   result: internal="${internalSectionNumber}" orig="${originalDisplayNumber}" amended="${amendedDisplayNumber}"`);
  
  return {
    internalSectionNumber,
    rawSectionMarker: rawMarker,
    originalDisplayNumber,
    amendedDisplayNumber,
    level: newPath.length,
  };
}

/**
 * Map format string to synthetic abstractNumId offset
 */
function formatToSyntheticId(format: string): number {
  switch (format) {
    case 'decimal': return 1;
    case 'lowerLetter': return 2;
    case 'upperLetter': return 3;
    case 'lowerRoman': return 4;
    case 'upperRoman': return 5;
    default: return 0;
  }
}

/**
 * Extract manual section number from the beginning of paragraph text.
 * Only matches if section number is at the very start of the paragraph.
 * 
 * Supported patterns:
 * - Decimal: "1.", "1 ", "12."
 * - Hierarchical decimal: "1.2.", "1.2.3 "
 * - Letters: "a.", "A.", "a)", "(a)"
 * - Roman: "i.", "ii.", "I.", "(i)", "i)"
 * - Parenthesized decimals: "(1)", "1)"
 */
function extractManualSectionFromText(text: string): { marker: string; remainingText: string } | null {
  if (!text) return null;
  
  const trimmed = text.trim();
  
  // Order matters - try more specific patterns first
  const patterns: RegExp[] = [
    // Hierarchical decimal: 1.2.3. or 1.2.3 (with required space/end after)
    /^(\d+(?:\.\d+)+\.?)\s+([\s\S]*)$/,
    
    // Full parentheses: (1), (a), (i), (A), (I)
    /^(\([0-9a-zA-Z]+\))\.?\s*([\s\S]*)$/,
    
    // Close paren only: 1), a), i)
    /^([0-9a-zA-Z]+\))\.?\s*([\s\S]*)$/,
    
    // Simple decimal with dot: 1. 2. 12.
    /^(\d+\.)\s+([\s\S]*)$/,
    
    // Letter with dot: a. b. A. B.
    /^([a-zA-Z]\.)\s+([\s\S]*)$/,
    
    // Roman with dot (2+ chars to avoid matching single letters): ii. iii. II.
    /^([ivxlcdmIVXLCDM]{2,}\.)\s+([\s\S]*)$/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const marker = match[1].trim();
      const remaining = match[2] || '';
      
      // Validate the marker is parseable
      const parsed = parseManualMarker(marker);
      if (parsed) {
        return { marker, remainingText: remaining };
      }
    }
  }
  
  return null;
}

/**
 * Create fresh path-based numbering state
 */
function createPathBasedNumberingState(): PathBasedNumberingState {
  return {
    path: [],
    topLevelAbstractNumId: null,
    seenAbstractNumIdsPerTopLevel: new Map(),
    levelCounters: new Map(),
  };
}

/**
 * Build a key for level counters based on parent context.
 * This ensures counters restart when parent changes.
 */
function buildLevelCounterKey(
  parentPath: PathLevelComponent[],
  abstractNumId: number,
  ilvl: number
): string {
  // Parent context is the combined positions of all ancestors
  const parentContext = parentPath.map(p => `${p.abstractNumId}:${p.combinedPosition}`).join('/');
  return `${parentContext}|${abstractNumId}_${ilvl}`;
}

/**
 * Get or create level counters for a specific level under a parent context.
 */
function getOrCreateLevelCounters(
  state: PathBasedNumberingState,
  parentPath: PathLevelComponent[],
  abstractNumId: number,
  ilvl: number
): { combined: number; original: number; amended: number } {
  const key = buildLevelCounterKey(parentPath, abstractNumId, ilvl);
  let counters = state.levelCounters.get(key);
  if (!counters) {
    counters = { combined: 0, original: 0, amended: 0 };
    state.levelCounters.set(key, counters);
  }
  return counters;
}

/**
 * Get the top-level key for tracking seen abstractNumIds.
 * Uses the first component's position as identifier.
 */
function getTopLevelKey(path: PathLevelComponent[]): string {
  if (path.length === 0) return '';
  return `${path[0].abstractNumId}_${path[0].combinedPosition}`;
}

/**
 * Find matching level in path by AbstractNumId and ilvl.
 * Returns index in path or -1 if not found.
 */
function findMatchingLevelInPath(
  path: PathLevelComponent[],
  abstractNumId: number,
  ilvl: number
): number {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].abstractNumId === abstractNumId && path[i].ilvl === ilvl) {
      return i;
    }
  }
  return -1;
}

/**
 * Find any level in path with matching AbstractNumId (regardless of ilvl).
 * Used to detect returning to a parent abstractNumId.
 * Returns index in path or -1 if not found.
 */
function findAnyLevelWithAbstractNumId(
  path: PathLevelComponent[],
  abstractNumId: number
): number {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].abstractNumId === abstractNumId) {
      return i;
    }
  }
  return -1;
}

/**
 * Render section number from path components.
 * Builds hierarchical number like "1.a.i." from path.
 * Handles mixed formats (decimal, letter, roman).
 */
function renderSectionNumberFromPath(
  path: PathLevelComponent[],
  positionType: 'combined' | 'original' | 'amended'
): string | null {
  const parts: string[] = [];
  
  for (const component of path) {
    let position: number | null;
    if (positionType === 'combined') {
      position = component.combinedPosition;
    } else if (positionType === 'original') {
      position = component.originalPosition;
    } else {
      position = component.amendedPosition;
    }
    
    if (position === null) {
      return null;  // This path doesn't exist in this version
    }
    
    // Format based on numFmt
    parts.push(formatNumber(position, component.numFmt));
  }
  
  if (parts.length === 0) return null;
  return parts.join('.') + '.';
}

/**
 * Render just the raw marker for the current level (not full path).
 * E.g., for path [4, K, ii], returns "ii." not "4.K.ii."
 */
function renderRawMarkerFromPath(
  path: PathLevelComponent[],
  positionType: 'combined' | 'original' | 'amended'
): string | null {
  if (path.length === 0) return null;
  
  const lastComponent = path[path.length - 1];
  let position: number | null;
  
  if (positionType === 'combined') {
    position = lastComponent.combinedPosition;
  } else if (positionType === 'original') {
    position = lastComponent.originalPosition;
  } else {
    position = lastComponent.amendedPosition;
  }
  
  if (position === null) return null;
  
  return formatNumber(position, lastComponent.numFmt) + '.';
}

/**
 * Process a paragraph's numbering using path-based algorithm.
 * Returns internal section number and display numbers for original/amended.
 */
function processPathBasedNumbering(
  model: NumberingModel,
  state: PathBasedNumberingState,
  numId: number,
  ilvl: number,
  paragraphStatus: 'unchanged' | 'inserted' | 'deleted'
): {
  internalSectionNumber: string;
  rawSectionMarker: string;
  originalDisplayNumber: string | null;
  amendedDisplayNumber: string | null;
  level: number;
} | null {
  // Resolve level definition
  const inst = model.numIdToInst.get(numId);
  if (!inst) return null;
  
  const abstractNumId = inst.abstractNumId;
  const levelKey = `${abstractNumId}_${ilvl}`;
  const levelDef = model.abstractLevelDef.get(levelKey);
  if (!levelDef) return null;
  
  const numFmt = levelDef.numFmt;
  
  // Skip bullets for section numbering
  if (numFmt === 'bullet') return null;
  
  // Track top-level AbstractNumId
  if (state.topLevelAbstractNumId === null) {
    state.topLevelAbstractNumId = abstractNumId;
  }
  
  // Determine where this item fits in the path using the corrected rules:
  // Rule 1: If abstractNumId NOT seen before under top-level AND not top-level abstractNumId
  //         → New child list (append to current path)
  // Rule 2: If abstractNumId WAS seen before under top-level OR is top-level abstractNumId
  //   Rule 2.1: If ilvl is DIFFERENT from previous occurrence with same abstractNumId
  //             → Child of immediately preceding section (append to current path)
  //   Rule 2.2: If ilvl is SAME as previous occurrence with same abstractNumId
  //             → Sibling (replace that component, discard everything after)
  
  let parentPath: PathLevelComponent[] = [];
  let insertionType: 'new' | 'sibling' | 'child' = 'new';
  
  if (state.path.length === 0) {
    // First numbered paragraph - start the path
    insertionType = 'new';
    parentPath = [];
    
    // Initialize seen set for this top-level
    const topLevelKey = `${abstractNumId}_1`;
    state.seenAbstractNumIdsPerTopLevel.set(topLevelKey, new Set([abstractNumId]));
  } else {
    const topLevelKey = getTopLevelKey(state.path);
    const seenUnderTopLevel = state.seenAbstractNumIdsPerTopLevel.get(topLevelKey) || new Set();
    const isTopLevelAbstractNumId = abstractNumId === state.topLevelAbstractNumId;
    const wasSeenBefore = seenUnderTopLevel.has(abstractNumId) || isTopLevelAbstractNumId;
    
    if (!wasSeenBefore) {
      // Rule 1: New child list - abstractNumId not seen before under this top-level
      insertionType = 'child';
      parentPath = [...state.path];
      
      // Mark this abstractNumId as seen under current top-level
      seenUnderTopLevel.add(abstractNumId);
      state.seenAbstractNumIdsPerTopLevel.set(topLevelKey, seenUnderTopLevel);
      
      // console.log(`[PATH] Rule 1: New child list. abstractNumId=${abstractNumId} not seen before.`);
    } else {
      // Rule 2: AbstractNumId was seen before
      // First, search for exact match: same abstractNumId AND same ilvl → Rule 2.2
      const siblingIndex = findMatchingLevelInPath(state.path, abstractNumId, ilvl);
      
      if (siblingIndex !== -1) {
        // Rule 2.2: Found component with same abstractNumId AND same ilvl → Sibling
        // Replace that component and discard everything after it
        insertionType = 'sibling';
        parentPath = state.path.slice(0, siblingIndex);
        
        // console.log(`[PATH] Rule 2.2: Sibling. abstractNumId=${abstractNumId} ilvl=${ilvl} found at path[${siblingIndex}].`);
      } else {
        // Rule 2.1: AbstractNumId was seen but no matching ilvl in current path
        // → Child of immediately preceding section (append to current path)
        insertionType = 'child';
        parentPath = [...state.path];
        
        // console.log(`[PATH] Rule 2.1: Child of immediately preceding. abstractNumId=${abstractNumId} ilvl=${ilvl} not found in path.`);
      }
    }
  }
  
  // Get or create counters for this level under this parent context
  const counters = getOrCreateLevelCounters(state, parentPath, abstractNumId, ilvl);
  
  // Increment counters based on paragraph status
  counters.combined++;
  if (paragraphStatus !== 'inserted') {
    counters.original++;
  }
  if (paragraphStatus !== 'deleted') {
    counters.amended++;
  }
  
  // Build the new path component
  const newComponent: PathLevelComponent = {
    abstractNumId,
    ilvl,
    numFmt,
    combinedPosition: counters.combined,
    originalPosition: paragraphStatus !== 'inserted' ? counters.original : null,
    amendedPosition: paragraphStatus !== 'deleted' ? counters.amended : null,
  };
  
  // Build new path
  const newPath = [...parentPath, newComponent];
  
  // Update state
  state.path = newPath;
  
  // Update seen abstractNumIds for new top-level if we're at top level
  if (newPath.length === 1) {
    const newTopKey = getTopLevelKey(newPath);
    if (!state.seenAbstractNumIdsPerTopLevel.has(newTopKey)) {
      state.seenAbstractNumIdsPerTopLevel.set(newTopKey, new Set([abstractNumId]));
    }
  }
  
  // Render section numbers
  const internalSectionNumber = renderSectionNumberFromPath(newPath, 'combined') || '';
  const originalDisplayNumber = renderSectionNumberFromPath(newPath, 'original');
  const amendedDisplayNumber = renderSectionNumberFromPath(newPath, 'amended');
  
  // Debug log
  // console.log(`[DEBUG PATH] numId=${numId} absNumId=${abstractNumId} ilvl=${ilvl} status=${paragraphStatus}`);
  // console.log(`[DEBUG PATH]   ${insertionType}: parentPath=[${parentPath.map(p => `${p.abstractNumId}:${p.ilvl}:${p.combinedPosition}`).join(',')}]`);
  // console.log(`[DEBUG PATH]   newPath=[${newPath.map(p => `${p.abstractNumId}:${p.ilvl}:${p.combinedPosition}`).join(',')}]`);
  // console.log(`[DEBUG PATH]   result: internal="${internalSectionNumber}" orig="${originalDisplayNumber}" amended="${amendedDisplayNumber}"`);

  const rawSectionMarker = renderRawMarkerFromPath(newPath, 'combined') || '';

  return {
    internalSectionNumber,
    rawSectionMarker,
    originalDisplayNumber,
    amendedDisplayNumber,
    level: newPath.length,
  };
}

/**
 * Stage 1: Extract all non-empty paragraphs with raw numbering info.
 * Does NOT compute path-based numbering - that happens in Stage 4 after boundaries are known.
 * This ensures recitals/closing don't pollute the numbering path state.
 */
export function extractOOXMLParagraphs(
  xmlDoc: Document
): OOXMLParagraph[] {
  const result: OOXMLParagraph[] = [];
  
  const paragraphs = xmlDoc.getElementsByTagNameNS("*", "p");

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const amendedText = extractTextFromParagraph(para, 'amended');
    const originalText = extractTextFromParagraph(para, 'original');
    const combinedText = extractTextFromParagraph(para, 'combined');

    // Check if paragraph has CURRENT numbering (even with empty text, it's a section header)
    // Note: We intentionally don't include deleted numbering (from pPrChange) here.
    // A paragraph with only deleted numbering and no text is a Word artifact, not a real section.
    // Real deleted sections have deleted TEXT content (in <w:del>), which shows up in originalText.
    const hasCurrentNumPr = getCurrentNumPr(para) !== null;

    // Skip truly empty paragraphs (no text AND no current section number)
    // - Paragraphs with current w:numPr even if text is empty: KEEP (section headers)
    // - Paragraphs with only deleted w:numPr (in pPrChange) but no text: SKIP (Word artifacts)
    // - Paragraphs with deleted w:numPr AND deleted text: KEEP (real deleted sections via originalText)
    if (!amendedText.trim() && !originalText.trim() && !combinedText.trim() && !hasCurrentNumPr) {
      continue;
    }

    const isTableCell = isParentTableCell(para);
    const paragraphStatus = getParagraphStatus(para);
    
    // Extract raw numPr info (do NOT compute path-based numbering yet)
    let rawNumPr: OOXMLParagraph['rawNumPr'] = null;
    let manualMarker: ParsedManualMarker | null = null;
    
    if (!isTableCell) {
      const numPr = getCurrentNumPr(para);
      const deletedNumPr = getDeletedNumPr(para);
      
      if (numPr) {
        const ilvlNode = numPr.getElementsByTagNameNS("*", "ilvl")[0];
        const ilvl = ilvlNode
          ? parseInt(ilvlNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            ) || "0")
          : 0;

        const numIdNode = numPr.getElementsByTagNameNS("*", "numId")[0];
        const numIdStr = numIdNode
          ? numIdNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            )
          : null;

        if (numIdStr) {
          rawNumPr = {
            numId: parseInt(numIdStr),
            ilvl,
            isDeleted: false,
          };
        }
      } else if (deletedNumPr) {
        const ilvlNode = deletedNumPr.getElementsByTagNameNS("*", "ilvl")[0];
        const ilvl = ilvlNode
          ? parseInt(ilvlNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            ) || "0")
          : 0;

        const numIdNode = deletedNumPr.getElementsByTagNameNS("*", "numId")[0];
        const numIdStr = numIdNode
          ? numIdNode.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "val"
            )
          : null;

        if (numIdStr) {
          rawNumPr = {
            numId: parseInt(numIdStr),
            ilvl,
            isDeleted: true,
          };
        }
      } else {
        // No auto-numbering - try to extract manual section number
        const textToCheck = combinedText || amendedText || originalText;
        const manualExtraction = extractManualSectionFromText(textToCheck);
        
        if (manualExtraction) {
          manualMarker = parseManualMarker(manualExtraction.marker);
        }
      }
    }

    const { trackChanges } = extractTextWithTrackChangeOffsets(para);

    // console.log(`[STAGE1] para=${i} rawNumPr=${JSON.stringify(rawNumPr)} manual=${!!manualMarker} text="${(combinedText || amendedText).substring(0,50)}..."`);

    result.push({
      index: i,
      text: amendedText,
      originalText: originalText,
      combinedText: combinedText,
      trackChanges,
      combinedTextLength: combinedText.length,
      numbering: null,           // Computed in Stage 4
      originalNumbering: null,   // Computed in Stage 4
      combinedNumbering: null,   // Computed in Stage 4
      unifiedNumbering: null,    // Computed in Stage 4
      rawNumPr,
      manualMarker,
      paragraphStatus,
      isTableCell,
    });
  }

  // console.log(`[extractOOXMLParagraphs] Stage 1: Extracted ${result.length} non-empty paragraphs from ${paragraphs.length} total`);
  
  return result;
}

/**
 * Stage 4: Compute unified numbering for main body paragraphs only.
 * Call this AFTER boundary detection, passing only the sliced main body.
 * Path state starts fresh - recitals/closing don't affect numbering.
 * 
 * @param paragraphs - Sliced array of main body paragraphs only
 * @param model - Numbering model from OOXML
 */
export function computeUnifiedNumbering(
  paragraphs: OOXMLParagraph[],
  model: NumberingModel
): void {
  const pathBasedState = createPathBasedNumberingState();
  const amendedState = createNumberingState();
  const originalState = createNumberingState();

  for (const para of paragraphs) {
    // Skip table cells
    if (para.isTableCell) continue;
    
    if (para.rawNumPr) {
      const { numId, ilvl, isDeleted } = para.rawNumPr;
      
      // Get format info from model
      const inst = model.numIdToInst.get(numId);
      const levelKey = inst ? `${inst.abstractNumId}_${ilvl}` : null;
      const levelDef = levelKey ? model.abstractLevelDef.get(levelKey) : null;
      const numFmt = levelDef?.numFmt || 'decimal';

      if (isDeleted) {
        // Numbering was removed via track changes
        para.originalNumbering = processNumberingWithModel(model, originalState, numId, ilvl);
        
        const pathBasedResult = processPathBasedNumbering(
          model,
          pathBasedState,
          numId,
          ilvl,
          'deleted'
        );
        
        if (pathBasedResult) {
          para.unifiedNumbering = {
            internalSectionNumber: pathBasedResult.internalSectionNumber,
            rawSectionMarker: pathBasedResult.rawSectionMarker,
            originalDisplayNumber: pathBasedResult.originalDisplayNumber,
            amendedDisplayNumber: null,
            level: pathBasedResult.level,
            format: numFmt,
          };
        }
      } else {
        // Normal numbering
        const hasAmendedContent = para.text.trim().length > 0;
        const hasOriginalContent = para.originalText.trim().length > 0;
        
        if (hasAmendedContent) {
          para.numbering = processNumberingWithModel(model, amendedState, numId, ilvl);
        }
        if (hasOriginalContent) {
          para.originalNumbering = processNumberingWithModel(model, originalState, numId, ilvl);
        }
        para.combinedNumbering = para.numbering;

        const pathBasedResult = processPathBasedNumbering(
          model,
          pathBasedState,
          numId,
          ilvl,
          para.paragraphStatus
        );
        
        if (pathBasedResult) {
          para.unifiedNumbering = {
            internalSectionNumber: pathBasedResult.internalSectionNumber,
            rawSectionMarker: pathBasedResult.rawSectionMarker,
            originalDisplayNumber: pathBasedResult.originalDisplayNumber,
            amendedDisplayNumber: pathBasedResult.amendedDisplayNumber,
            level: pathBasedResult.level,
            format: numFmt,
          };
        }
      }
    } else if (para.manualMarker) {
      // Manual section number from text
      const pathBasedResult = processManualPathBasedNumbering(
        pathBasedState,
        para.manualMarker,
        para.paragraphStatus
      );
      
      if (pathBasedResult) {
        para.unifiedNumbering = {
          internalSectionNumber: pathBasedResult.internalSectionNumber,
          rawSectionMarker: pathBasedResult.rawSectionMarker,
          originalDisplayNumber: pathBasedResult.originalDisplayNumber,
          amendedDisplayNumber: pathBasedResult.amendedDisplayNumber,
          level: pathBasedResult.level,
          format: para.manualMarker.format,
        };
        
        const level = pathBasedResult.level - 1;
        
        if (para.text.trim()) {
          para.numbering = {
            sectionNumber: pathBasedResult.amendedDisplayNumber || pathBasedResult.internalSectionNumber,
            level: Math.max(0, level),
            format: para.manualMarker.format,
          };
        }
        
        if (para.originalText.trim()) {
          para.originalNumbering = {
            sectionNumber: pathBasedResult.originalDisplayNumber || pathBasedResult.internalSectionNumber,
            level: Math.max(0, level),
            format: para.manualMarker.format,
          };
        }
        
        para.combinedNumbering = para.numbering;
      }
    }
  }
}

/**
 * Render a simple section marker from rawNumPr for boundary detection.
 * This is a lightweight version that doesn't track path state - just renders
 * the marker as it appears in the document.
 * Used before boundary detection when we need section numbers but haven't
 * parsed the tree yet.
 */
export function renderSimpleMarkerFromNumPr(
  model: NumberingModel,
  numId: number,
  ilvl: number
): string | null {
  const inst = model.numIdToInst.get(numId);
  if (!inst) return null;

  const levelKey = `${inst.abstractNumId}_${ilvl}`;
  const levelDef = model.abstractLevelDef.get(levelKey);
  if (!levelDef) return null;

  if (levelDef.numFmt === 'bullet') return null;

  // For simple marker, we just need the format - actual counter value
  // will be determined by position. Return format indicator.
  return levelDef.numFmt;
}

/**
 * Build paragraph texts with section markers prepended for boundary detection.
 * Uses rawNumPr or manualMarker to reconstruct what the section number looks like.
 * This allows findFirstMainBodyIndex to work before full tree parsing.
 */
export function buildTextsWithSectionMarkers(
  paragraphs: OOXMLParagraph[],
  model: NumberingModel
): string[] {
  const result: string[] = [];
  
  // Track counters per numId+ilvl for hierarchical rendering
  const counters: Map<string, number> = new Map();
  
  for (const para of paragraphs) {
    let textWithMarker = para.combinedText || para.text;
    
    if (para.isTableCell) {
      result.push(textWithMarker);
      continue;
    }
    
    if (para.rawNumPr && !para.rawNumPr.isDeleted) {
      const { numId, ilvl } = para.rawNumPr;
      const inst = model.numIdToInst.get(numId);
      
      if (inst) {
        const levelKey = `${inst.abstractNumId}_${ilvl}`;
        const levelDef = model.abstractLevelDef.get(levelKey);
        
        if (levelDef && levelDef.numFmt !== 'bullet') {
          // Increment counter for this level
          const counterKey = `${numId}_${ilvl}`;
          const currentCount = (counters.get(counterKey) || 0) + 1;
          counters.set(counterKey, currentCount);
          
          // Reset deeper levels
          for (let deeper = ilvl + 1; deeper < 10; deeper++) {
            counters.delete(`${numId}_${deeper}`);
          }
          
          // BUILD FULL HIERARCHICAL MARKER 
          const parts: string[] = [];
          for (let level = 0; level <= ilvl; level++) {
            const levelCounterKey = `${numId}_${level}`;
            const levelCount = counters.get(levelCounterKey) || 1;
            parts.push(levelCount.toString());
          }
          const marker = parts.join('.') + '.';
          
          const indent = ilvl > 0 ? '  '.repeat(ilvl) : '';
          textWithMarker = `${indent}${marker} ${para.combinedText || para.text}`;
        }
      }
    } else if (para.manualMarker) {
      // Manual marker already in text
      textWithMarker = para.combinedText || para.text;
    }
    
    result.push(textWithMarker);
  }
  
  return result;
}

/**
 * Format a number for section marker display
 */
function formatNumberForMarker(num: number, format: string): string {
  switch (format) {
    case 'decimal':
      return `${num}.`;
    case 'lowerLetter':
      return `${toLetter(num).toLowerCase()})`;
    case 'upperLetter':
      return `${toLetter(num).toUpperCase()})`;
    case 'lowerRoman':
      return `(${toRoman(num).toLowerCase()})`;
    case 'upperRoman':
      return `(${toRoman(num).toUpperCase()})`;
    default:
      return `${num}.`;
  }
}

/**
 * Build paragraph-to-section mappings from OOXML.
 * Returns only non-empty paragraphs with their original indices.
 * 
 * This allows direct position-based mapping with filtered Word API paragraphs.
 */
export function buildOOXMLParagraphMappings(
  xmlDoc: Document,
  firstSectionParagraphIndex: number,
  closingStartIndex: number,
  appendicesStartIndex: number,
  mode: OOXMLExtractionMode = 'amended'
): OOXMLParagraphSectionMapping[] {
  const mappings: OOXMLParagraphSectionMapping[] = [];
  const model = buildNumberingModel(xmlDoc);
  const paragraphs = xmlDoc.getElementsByTagNameNS("*", "p");
  const state = createNumberingState();

  let currentSectionNumber: string | null = null;
  
  let mainBodyEndNonEmptyIndex = Infinity;
  if (closingStartIndex >= 0) {
    mainBodyEndNonEmptyIndex = closingStartIndex;
  } else if (appendicesStartIndex >= 0) {
    mainBodyEndNonEmptyIndex = appendicesStartIndex;
  }

  let nonEmptyCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const actualText = extractTextFromParagraph(para, mode);

    if (!actualText.trim()) {
      continue;
    }

    if (isParentTableCell(para)) {
      mappings.push({
        ooxmlIndex: i,
        sectionNumber: currentSectionNumber,
        text: actualText.substring(0, 50),
      });
      nonEmptyCount++;
      continue;
    }

    if (nonEmptyCount < firstSectionParagraphIndex) {
      mappings.push({
        ooxmlIndex: i,
        sectionNumber: null,
        text: actualText.substring(0, 50),
      });
      nonEmptyCount++;
      continue;
    }

    if (nonEmptyCount >= mainBodyEndNonEmptyIndex) {
      mappings.push({
        ooxmlIndex: i,
        sectionNumber: null,
        text: actualText.substring(0, 50),
      });
      nonEmptyCount++;
      continue;
    }

    let parsedSectionNumber: string | null = null;
    const numPr = getCurrentNumPr(para);

    if (numPr) {
      const ilvlNode = numPr.getElementsByTagNameNS("*", "ilvl")[0];
      const ilvl = ilvlNode
        ? parseInt(ilvlNode.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          ) || "0")
        : 0;

      const numIdNode = numPr.getElementsByTagNameNS("*", "numId")[0];
      const numIdStr = numIdNode
        ? numIdNode.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "val"
          )
        : null;

      if (numIdStr) {
        const numId = parseInt(numIdStr);
        const result = processNumberingWithModel(model, state, numId, ilvl);
        if (result) {
          parsedSectionNumber = result.sectionNumber;
        }
      }
    } else {
      parsedSectionNumber = extractSectionNumberFromText(actualText);
      if (parsedSectionNumber) {
        parsedSectionNumber = normalizeSectionNumberForMapping(parsedSectionNumber);
      }
    }

    if (parsedSectionNumber) {
      currentSectionNumber = parsedSectionNumber;
    }

    mappings.push({
      ooxmlIndex: i,
      sectionNumber: currentSectionNumber,
      text: actualText.substring(0, 50),
    });
    nonEmptyCount++;
  }

  console.log(`[buildOOXMLParagraphMappings] Built ${mappings.length} mappings from ${paragraphs.length} OOXML paragraphs`);
  return mappings;
}

function normalizeSectionNumberForMapping(sectionNum: string): string {
  const trimmed = sectionNum.trim();
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

/**
 * Check if a paragraph is entirely an insertion (all content inside <w:ins>)
 */
export function isParagraphFullyInserted(para: Element): boolean {
  const runs = para.getElementsByTagNameNS("*", "r");
  if (runs.length === 0) return false;
  
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    // Check if run has any text content
    const hasText = Array.from(run.childNodes).some(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const localName = el.localName || el.nodeName.replace(/^w:/, '');
        return localName === 't' && (el.textContent?.trim() || '');
      }
      return false;
    });
    
    if (hasText && !isInsideInsertion(run)) {
      return false;  // Has text that's NOT inside insertion
    }
  }
  
  return true;  // All text-bearing runs are inside insertions
}

/**
 * Determine the track change status of a paragraph.
 * - 'deleted': Entire paragraph AND its section number are deleted
 *   (ALL text in <w:del> AND <w:del> in <w:pPr><w:rPr>)
 * - 'inserted': Entire paragraph content is fully inserted
 *   (ALL text in <w:ins> - Word doesn't always mark pPr)
 * - 'unchanged': Paragraph exists in both original and amended
 */
export function getParagraphStatus(para: Element): 'unchanged' | 'inserted' | 'deleted' {
  const runs = para.getElementsByTagNameNS("*", "r");
  const numberingDeleted = isParagraphNumberingDeleted(para);
  
  let hasDeletedContent = false;
  let hasInsertedContent = false;
  let hasUnchangedContent = false;
  
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const inDeletion = isInsideDeletion(run);
    const inInsertion = isInsideInsertion(run);
    
    const children = Array.from(run.childNodes);
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      const localName = el.localName || el.nodeName.replace(/^w:/, '');
      const textContent = el.textContent?.trim() || '';
      
      if (!textContent) continue;  // Skip whitespace-only
      
      if (localName === 'delText') {
        hasDeletedContent = true;
      } else if (localName === 't') {
        if (inDeletion) {
          hasDeletedContent = true;
        } else if (inInsertion) {
          hasInsertedContent = true;
        } else {
          hasUnchangedContent = true;
        }
      }
    }
  }
  
  // Fully deleted: only deleted content AND numbering is deleted
  // (If numbering survives, paragraph exists as empty section in amended)
  if (hasDeletedContent && !hasInsertedContent && !hasUnchangedContent && numberingDeleted) {
    return 'deleted';
  }
  
  // Fully inserted: only inserted content, no deleted or unchanged
  if (hasInsertedContent && !hasDeletedContent && !hasUnchangedContent) {
    return 'inserted';
  }
  
  return 'unchanged';
}

/**
 * Check if paragraph's section NUMBER is inserted (not just content).
 * Looks for <w:ins> inside <w:pPr><w:rPr>.
 */
function isParagraphNumberingInserted(para: Element): boolean {
  const pPr = para.getElementsByTagNameNS("*", "pPr")[0];
  if (!pPr) return false;
  
  const rPr = pPr.getElementsByTagNameNS("*", "rPr")[0];
  if (!rPr) return false;
  
  const ins = rPr.getElementsByTagNameNS("*", "ins")[0];
  return !!ins;
}

/**
 * Check if a paragraph is entirely a deletion (all content inside <w:del>)
 */
export function isParagraphFullyDeleted(para: Element): boolean {
  const runs = para.getElementsByTagNameNS("*", "r");
  if (runs.length === 0) return false;
  
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    // Check if run has any text content (including delText)
    const hasText = Array.from(run.childNodes).some(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const localName = el.localName || el.nodeName.replace(/^w:/, '');
        return (localName === 't' || localName === 'delText') && (el.textContent?.trim() || '');
      }
      return false;
    });
    
    if (hasText && !isInsideDeletion(run)) {
      return false;  // Has text that's NOT inside deletion
    }
  }
  
  return true;  // All text-bearing runs are inside deletions
}

// ========================================
// OOXML TRACK CHANGE EXTRACTION
// ========================================

export interface OOXMLTrackChange {
  id: string;
  type: 'insertion' | 'deletion';
  text: string;
  ooxmlParagraphIndex: number;
  author?: string;
  date?: Date;
  positionInParagraph: number;
  // Paragraph text in both versions (for accurate display)
  originalParagraphText: string;
  amendedParagraphText: string;
}

/**
 * Extract track changes directly from OOXML.
 * Returns changes with OOXML paragraph indices (consistent with document parsing).
 */
export function extractTrackChangesFromOOXML(xmlDoc: Document): OOXMLTrackChange[] {
  const changes: OOXMLTrackChange[] = [];
  let changeIdCounter = 0;
  
  // Get only body paragraphs (same as Word API body.paragraphs)
  const body = xmlDoc.getElementsByTagNameNS(
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "body"
  )[0] || xmlDoc.getElementsByTagNameNS("*", "body")[0];
  
  if (!body) {
    console.warn('[extractTrackChangesFromOOXML] No <w:body> found in document');
    return changes;
  }
  
  const paragraphs = body.getElementsByTagNameNS("*", "p");
  
  for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
    const para = paragraphs[paraIndex];
    let positionCounter = 0;
    
    // Track changes can be at paragraph level or inside runs
    // Process in document order to maintain position tracking
    const changeElements = collectTrackChangeElements(para);
    
    if (changeElements.length === 0) continue;
    
    // Extract paragraph text in both versions (only for paragraphs with changes)
    const originalParagraphText = extractTextFromParagraph(para, 'original');
    const amendedParagraphText = extractTextFromParagraph(para, 'amended');
    
    for (const { element, type } of changeElements) {
      const text = extractTextFromTrackChangeElement(element, type);
      
      if (text && text.trim() && !/^[\r\n\s]*$/.test(text)) {
        changes.push({
          id: `ooxml-tc-${changeIdCounter++}`,
          type: type,
          text: text,
          ooxmlParagraphIndex: paraIndex,
          author: element.getAttributeNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "author"
          ) || element.getAttribute('w:author') || undefined,
          date: parseWordDate(
            element.getAttributeNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "date"
            ) || element.getAttribute('w:date')
          ),
          positionInParagraph: positionCounter++,
          originalParagraphText,
          amendedParagraphText,
        });
      }
    }
  }
  
  // Debug output
  const insertionCount = changes.filter(c => c.type === 'insertion').length;
  const deletionCount = changes.filter(c => c.type === 'deletion').length;
  console.log(`[extractTrackChangesFromOOXML] Found ${changes.length} track changes (${insertionCount} insertions, ${deletionCount} deletions)`);
  
  return changes;
}



/**
 * Collect all track change elements from a paragraph in document order.
 * Handles both direct children and nested elements.
 */
function collectTrackChangeElements(para: Element): { element: Element; type: 'insertion' | 'deletion' }[] {
  const result: { element: Element; type: 'insertion' | 'deletion' }[] = [];
  
  // Get all ins and del elements, but avoid duplicates from nested structures
  const processedIds = new Set<string>();
  
  const insertions = para.getElementsByTagNameNS("*", "ins");
  for (let i = 0; i < insertions.length; i++) {
    const ins = insertions[i];
    const id = ins.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "id"
    ) || ins.getAttribute('w:id') || `ins-${i}`;
    
    if (!processedIds.has(id)) {
      processedIds.add(id);
      result.push({ element: ins, type: 'insertion' });
    }
  }
  
  const deletions = para.getElementsByTagNameNS("*", "del");
  for (let i = 0; i < deletions.length; i++) {
    const del = deletions[i];
    const id = del.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "id"
    ) || del.getAttribute('w:id') || `del-${i}`;
    
    if (!processedIds.has(id)) {
      processedIds.add(id);
      result.push({ element: del, type: 'deletion' });
    }
  }
  
  return result;
}

/**
 * Extract text content from <w:ins> or <w:del> element
 */
function extractTextFromTrackChangeElement(
  element: Element, 
  type: 'insertion' | 'deletion'
): string {
  let text = '';
  
  const runs = element.getElementsByTagNameNS("*", "r");
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const children = run.childNodes;
    
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const localName = el.localName || el.nodeName.replace(/^w:/, '');
        
        if (localName === 't') {
          text += el.textContent || '';
        } else if (localName === 'delText' && type === 'deletion') {
          text += el.textContent || '';
        } else if (localName === 'tab') {
          text += ' ';
        } else if (localName === 'br') {
          text += ' ';
        }
      }
    }
  }
  
  return text;
}

/**
 * Parse Word date format (ISO 8601)
 */
function parseWordDate(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;
  try {
    return new Date(dateStr);
  } catch {
    return undefined;
  }
}

/**
 * Find section containing a specific OOXML paragraph index.
 * Searches through structure nodes and their ooxmlIndices.
 */
export function findSectionByOoxmlIndex(
  ooxmlIndex: number,
  structure: DocumentNodeWithRange[]
): { 
  sectionNumber: string; 
  level: number; 
  topLevelSectionNumber: string;
  originalDisplayNumber?: string | null;
  amendedDisplayNumber?: string | null;
} | null {
  
  function getTopLevel(sectionNumber: string): string {
    const match = sectionNumber.match(/^(\d+)\./);
    return match ? match[0] : sectionNumber;
  }
  
  function searchNode(
    node: DocumentNodeWithRange, 
    topLevel: string
  ): { 
    sectionNumber: string; 
    level: number; 
    topLevelSectionNumber: string;
    originalDisplayNumber?: string | null;
    amendedDisplayNumber?: string | null;
  } | null {
    
    // Check if this node contains the OOXML index
    const indices = node.ooxmlIndices || [];
    if (indices.includes(ooxmlIndex)) {
      return {
        sectionNumber: node.sectionNumber,
        level: node.level,
        topLevelSectionNumber: topLevel,
        originalDisplayNumber: node.originalDisplayNumber,
        amendedDisplayNumber: node.amendedDisplayNumber,
      };
    }
    
    // Search children
    if (node.children) {
      for (const child of node.children) {
        const result = searchNode(child, topLevel);
        if (result) return result;
      }
    }
    
    return null;
  }
  
  for (const node of structure) {
    const topLevel = getTopLevel(node.sectionNumber);
    const result = searchNode(node, topLevel);
    if (result) return result;
  }
  
  return null;
}

/**
 * Find the nearest section for an OOXML index that isn't directly in any section.
 * Used for paragraphs outside the main structure (recitals, closing, etc.)
 */
export function findNearestSectionByOoxmlIndex(
  ooxmlIndex: number,
  structure: DocumentNodeWithRange[]
): { sectionNumber: string; topLevelSectionNumber: string } | null {
  
  function getTopLevel(sectionNumber: string): string {
    const match = sectionNumber.match(/^(\d+)\./);
    return match ? match[0] : sectionNumber;
  }
  
  // Collect all indices from structure
  const allIndices: { ooxmlIndex: number; sectionNumber: string; topLevel: string }[] = [];
  
  function collectIndices(node: DocumentNodeWithRange, topLevel: string) {
    const indices = node.ooxmlIndices || [];
    for (const idx of indices) {
      allIndices.push({ ooxmlIndex: idx, sectionNumber: node.sectionNumber, topLevel });
    }
    if (node.children) {
      for (const child of node.children) {
        collectIndices(child, topLevel);
      }
    }
  }
  
  for (const node of structure) {
    collectIndices(node, getTopLevel(node.sectionNumber));
  }
  
  // Sort by index
  allIndices.sort((a, b) => a.ooxmlIndex - b.ooxmlIndex);
  
  // Find nearest
  let nearest: { sectionNumber: string; topLevel: string } | null = null;
  
  // Look for section before this index
  for (let i = allIndices.length - 1; i >= 0; i--) {
    if (allIndices[i].ooxmlIndex <= ooxmlIndex) {
      nearest = { sectionNumber: allIndices[i].sectionNumber, topLevel: allIndices[i].topLevel };
      break;
    }
  }
  
  // If not found, look for section after
  if (!nearest && allIndices.length > 0) {
    for (const item of allIndices) {
      if (item.ooxmlIndex > ooxmlIndex) {
        nearest = { sectionNumber: item.sectionNumber, topLevel: item.topLevel };
        break;
      }
    }
  }
  
  if (nearest) {
    return { sectionNumber: nearest.sectionNumber, topLevelSectionNumber: nearest.topLevel };
  }
  
  return null;
}

