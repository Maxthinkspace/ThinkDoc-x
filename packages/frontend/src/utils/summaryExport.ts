import ExcelJS from "exceljs";
import type { FlattenedSummaryItem } from "@/src/taskpane/pages/AnnotationSummary";

/**
 * Parse section number for sorting by document position.
 */
function parseSectionNumber(sectionNumber: string): number[] {
  const cleaned = sectionNumber.replace(/^Section\s*/i, '').trim();
  const parts = cleaned.split('.').map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
  return parts;
}

/**
 * Compare two section numbers for sorting.
 */
function compareSectionNumbers(a: string, b: string): number {
  const partsA = parseSectionNumber(a);
  const partsB = parseSectionNumber(b);
  const maxLength = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

/**
 * Get the specific section number from sourceAnnotation.
 */
function getSectionNumber(item: FlattenedSummaryItem): string {
  const sectionNum = item.sourceAnnotation.sectionNumber || item.sectionNumber;
  if (sectionNum.toLowerCase().startsWith('section')) {
    return sectionNum;
  }
  return `Section ${sectionNum}`;
}

/**
 * Sort items by section number (document position).
 */
function sortBySectionNumber(items: FlattenedSummaryItem[]): FlattenedSummaryItem[] {
  return [...items].sort((a, b) => 
    compareSectionNumbers(
      a.sourceAnnotation.sectionNumber || a.sectionNumber,
      b.sourceAnnotation.sectionNumber || b.sectionNumber
    )
  );
}

/**
 * Get annotation type display string.
 */
function getAnnotationType(item: FlattenedSummaryItem): string {
  const { sourceAnnotation } = item;
  if (sourceAnnotation.type === 'comment') {
    return 'Comments';
  }
  return 'Track Changes';
}

/**
 * Get text content based on annotation type.
 */
function getTextContent(item: FlattenedSummaryItem): string {
  const { sourceAnnotation } = item;
  
  if (sourceAnnotation.type === 'comment') {
    const fullText = item.sentence || '';
    const highlighted = sourceAnnotation.selectedText || '';
    return `Text: ${fullText}\n\nHighlighted: ${highlighted}`;
  }
  
  if (sourceAnnotation.type === 'trackChange') {
    return `Original text: ${sourceAnnotation.originalSentence || ''}\n\nAmended text: ${sourceAnnotation.amendedSentence || ''}`;
  }
  
  if (sourceAnnotation.type === 'fullSentenceDeletion') {
    return `Original text: ${sourceAnnotation.deletedText || ''}\n\nAmended text: [DELETED]`;
  }
  
  if (sourceAnnotation.type === 'fullSentenceInsertion') {
    return `Original text: [NEW]\n\nAmended text: ${sourceAnnotation.insertedText || ''}`;
  }
  
  return '';
}

/**
 * Style header row.
 */
function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
}

/**
 * Style data row.
 */
function styleDataRow(row: ExcelJS.Row): void {
  row.alignment = { vertical: 'top', wrapText: true };
}

/**
 * Create amendments worksheet.
 */
function createAmendmentsSheet(
  workbook: ExcelJS.Workbook,
  items: FlattenedSummaryItem[],
  includeRecommendations: boolean
): void {
  const sheet = workbook.addWorksheet('Contract Amendments');
  const sortedItems = sortBySectionNumber(items);
  
  // Define columns
  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'No.', key: 'no', width: 6 },
    { header: 'Section Number', key: 'sectionNumber', width: 18 },
    { header: 'Annotation Type', key: 'annotationType', width: 16 },
    { header: 'Text', key: 'text', width: 50 },
    { header: 'Change Description', key: 'changeDescription', width: 40 },
    { header: 'Implication', key: 'implication', width: 40 },
  ];
  
  if (includeRecommendations) {
    columns.push({ header: 'Recommendation', key: 'recommendation', width: 40 });
  }
  
  sheet.columns = columns;
  
  // Style header row
  styleHeaderRow(sheet.getRow(1));
  
  // Add data rows
  sortedItems.forEach((item, index) => {
    const rowData: Record<string, string | number> = {
      no: index + 1,
      sectionNumber: getSectionNumber(item),
      annotationType: getAnnotationType(item),
      text: getTextContent(item),
      changeDescription: item.changeDescription || '',
      implication: item.implication || '',
    };
    
    if (includeRecommendations) {
      rowData.recommendation = item.recommendation || '';
    }
    
    const row = sheet.addRow(rowData);
    styleDataRow(row);
  });
}

/**
 * Create queries worksheet.
 */
function createQueriesSheet(
  workbook: ExcelJS.Workbook,
  items: FlattenedSummaryItem[]
): void {
  const sheet = workbook.addWorksheet('Instruction Requests');
  const sortedItems = sortBySectionNumber(items);
  
  // Define columns
  sheet.columns = [
    { header: 'No.', key: 'no', width: 6 },
    { header: 'Section Number', key: 'sectionNumber', width: 18 },
    { header: 'Annotation Type', key: 'annotationType', width: 16 },
    { header: 'Text', key: 'text', width: 50 },
    { header: 'Instruction Request', key: 'instructionRequest', width: 50 },
  ];
  
  // Style header row
  styleHeaderRow(sheet.getRow(1));
  
  // Add data rows
  sortedItems.forEach((item, index) => {
    const row = sheet.addRow({
      no: index + 1,
      sectionNumber: getSectionNumber(item),
      annotationType: getAnnotationType(item),
      text: getTextContent(item),
      instructionRequest: item.queryItems?.join('\n') || '',
    });
    styleDataRow(row);
  });
}

/**
 * Export summary items to Excel.
 */
export async function exportSummaryToExcel(
  items: FlattenedSummaryItem[],
  exportType: 'amendments' | 'queries' | 'full'
): Promise<void> {
  // Read config to check if recommendations should be included
  let includeRecommendations = true;
  try {
    const config = localStorage.getItem('summaryConfig');
    if (config) {
      const parsed = JSON.parse(config);
      includeRecommendations = parsed.includeRecommendations !== false;
    }
  } catch (e) {
    console.error('Failed to read summary config:', e);
  }
  
  // Separate items by type
  const amendments = items.filter(item => item.type === 'substantive');
  const queries = items.filter(item => item.type === 'query');
  
  console.log('[exportSummaryToExcel] Export type:', exportType);
  console.log('[exportSummaryToExcel] Total items:', items.length);
  console.log('[exportSummaryToExcel] Amendments:', amendments.length);
  console.log('[exportSummaryToExcel] Queries:', queries.length);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contract Review Tool';
  workbook.created = new Date();
  
  if (exportType === 'amendments') {
    createAmendmentsSheet(workbook, amendments, includeRecommendations);
  } else if (exportType === 'queries') {
    createQueriesSheet(workbook, queries);
  } else {
    // Full export - only create sheets that have items
    if (amendments.length > 0) {
      createAmendmentsSheet(workbook, amendments, includeRecommendations);
    }
    if (queries.length > 0) {
      createQueriesSheet(workbook, queries);
    }
  }

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Annotation Summary.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}