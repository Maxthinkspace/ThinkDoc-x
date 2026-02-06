import { logger } from '@/config/logger';
import { db } from '@/config/database';
import { vaultQueries } from '@/db/schema/vault';
import { eq } from 'drizzle-orm';
import { updateJobProgress } from '@/utils/jobStore';
import { generateTextWithJsonParsing, generateTextDirect } from '../../controllers/generate';
import { jsonrepair } from 'jsonrepair';
import type { ColumnConfig } from '@/schemas/vault';
import { documentChunkingService, type DocumentChunk } from '@/services/document-chunking';

// Re-export for consumers
export type { ColumnConfig };

// ============================================
// TYPES
// ============================================

export interface VaultFileData {
  id: string;
  name: string;
  extractedText: string | null;
  parsedStructure: unknown;
}

export interface ExtractionResult {
  fileId: string;
  fileName: string;
  columns: Record<string, {
    value: string;
    confidence: 'high' | 'medium' | 'low';
    sourceSnippet?: string;
    pageNumber?: number;
    highlightBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
      pageWidth: number;
      pageHeight: number;
      pageNumber?: number;
    };
  }>;
}

export interface AskQueryResult {
  answer: string;
  sources: Array<{
    fileId: string;
    fileName: string;
    snippet: string;
  }>;
}

// ============================================
// HELPER: Parse JSON from LLM response
// ============================================

function parseJsonResponse(content: string): any {
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = codeBlockMatch ? codeBlockMatch[1] : content;

    const jsonMatch = jsonString?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const repairedJson = jsonrepair(jsonMatch[0]);
      return JSON.parse(repairedJson);
    }

    throw new Error("No JSON found in response");
  } catch (error) {
    logger.error({ error, content: content.slice(0, 500) }, 'Failed to parse JSON from LLM response');
    throw new Error("Failed to parse JSON from AI response");
  }
}

// ============================================
// COLUMN GENERATION
// ============================================

export async function generateColumnsFromPrompt(
  prompt: string,
  existingColumns?: ColumnConfig[]
): Promise<ColumnConfig[]> {
  logger.info({ prompt, existingColumnsCount: existingColumns?.length }, 'Vault: Generating columns from prompt');

  const systemPrompt = `You are a legal document analysis expert. Based on the user's description of what they want to extract from contracts, generate appropriate column configurations.

Each column should have:
- id: A unique identifier (use kebab-case like "change-of-control-definition")
- type: One of:
  - "free-response": For open-ended answers
  - "date": For date extraction
  - "classification": For yes/no or multiple choice (include classificationOptions)
  - "verbatim": For exact quotes from the document
- name: Human-readable column header
- query: The specific question to ask about each document

Generate columns that would comprehensively answer the user's questions about their documents.

Respond ONLY with valid JSON in this format:
{
  "columns": [
    {
      "id": "column-id",
      "type": "free-response",
      "name": "Column Name",
      "query": "Question to ask"
    }
  ]
}`;

  const userPrompt = existingColumns?.length
    ? `User request: ${prompt}\n\nExisting columns (add more, don't duplicate):\n${JSON.stringify(existingColumns, null, 2)}`
    : `User request: ${prompt}`;

  try {
    const parsed = await generateTextWithJsonParsing(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3 }
    );
    const columns = parsed.columns || [];

    logger.info({ columnsGenerated: columns.length }, 'Vault: Columns generated');

    return columns;
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to generate columns');
    throw new Error('Failed to generate columns');
  }
}

// ============================================
// EXTRACTION WORKFLOW
// ============================================

export async function runExtractionWorkflow(
  jobId: string,
  queryId: string,
  files: VaultFileData[],
  columns: ColumnConfig[]
): Promise<{ results: ExtractionResult[] }> {
  logger.info({ jobId, queryId, fileCount: files.length, columnCount: columns.length }, 'Vault: Starting extraction workflow');

  const results: ExtractionResult[] = [];
  let processedCount = 0;

  // Update query status to processing
  await db
    .update(vaultQueries)
    .set({ status: 'processing' })
    .where(eq(vaultQueries.id, queryId));

  for (const file of files) {
    try {
      updateJobProgress(jobId, processedCount, files.length, `Processing ${file.name}...`);

      const fileResult = await extractFromFile(file, columns);
      results.push(fileResult);

      processedCount++;
    } catch (error) {
      logger.error({ error, fileId: file.id, fileName: file.name }, 'Vault: Failed to extract from file');
      
      // Add error result for this file
      results.push({
        fileId: file.id,
        fileName: file.name,
        columns: Object.fromEntries(
          columns.map(col => [col.id, { value: 'Error extracting', confidence: 'low' as const }])
        ),
      });
      
      processedCount++;
    }
  }

  // Update query with results
  await db
    .update(vaultQueries)
    .set({
      status: 'completed',
      results: { results } as unknown as typeof vaultQueries.$inferInsert.results,
      completedAt: new Date(),
    })
    .where(eq(vaultQueries.id, queryId));

  logger.info({ jobId, queryId, resultsCount: results.length }, 'Vault: Extraction workflow completed');

  return { results };
}

async function extractFromFile(
  file: VaultFileData,
  columns: ColumnConfig[]
): Promise<ExtractionResult> {
  if (!file.extractedText) {
    throw new Error(`No extracted text for file ${file.name}`);
  }

  const columnResults: ExtractionResult['columns'] = {};
  const chunks = documentChunkingService.chunkExtractedText(file.extractedText, file.name);

  // Build a single prompt for all columns (more efficient than per-column)
  const columnPrompts = columns.map((col, idx) => {
    let typeInstruction = '';
    switch (col.type) {
      case 'date':
        typeInstruction = 'Extract the date in ISO format (YYYY-MM-DD) if found.';
        break;
      case 'classification':
        typeInstruction = col.classificationOptions?.length
          ? `Choose ONLY from these options: ${col.classificationOptions.join(', ')}`
          : 'Answer Yes or No.';
        break;
      case 'verbatim':
        typeInstruction = 'Quote the exact text from the document. Use "Not found" if not present.';
        break;
      default:
        typeInstruction = 'Provide a concise answer based on the document.';
    }
    return `${idx + 1}. ${col.name}\nQuestion: ${col.query}\nInstruction: ${typeInstruction}`;
  }).join('\n\n');

  const systemPrompt = `You are a legal document analyst. Extract information from the provided document and answer each question.

For each answer, also provide:
- confidence: "high" if clearly stated, "medium" if inferred, "low" if uncertain
- sourceSnippet: A brief quote from the document supporting your answer (if applicable)

Respond ONLY with valid JSON in this format:
{
  "answers": [
    {
      "columnId": "column-id",
      "value": "your answer",
      "confidence": "high",
      "sourceSnippet": "relevant quote"
    }
  ]
}`;

  const userPrompt = `Document: ${file.name}

Content:
---
${file.extractedText.slice(0, 50000)}
---

Questions to answer:
${columnPrompts}

Column IDs in order: ${columns.map(c => c.id).join(', ')}`;

  try {
    const parsed = await generateTextWithJsonParsing(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.1 }
    );
    
    for (const answer of parsed.answers || []) {
      const matchedChunk = answer.sourceSnippet
        ? findBestMatchingChunk(chunks, answer.sourceSnippet)
        : chunks[0] || null;

      const highlightBox = matchedChunk?.highlightBox
        ? { ...matchedChunk.highlightBox, pageNumber: matchedChunk.pageNumber }
        : undefined;

      columnResults[answer.columnId] = {
        value: answer.value || 'Not found',
        confidence: answer.confidence || 'medium',
        sourceSnippet: answer.sourceSnippet,
        pageNumber: matchedChunk?.pageNumber,
        highlightBox,
      };
    }

    // Fill in any missing columns
    for (const col of columns) {
      if (!columnResults[col.id]) {
        columnResults[col.id] = {
          value: 'Not found',
          confidence: 'low',
        };
      }
    }
  } catch (error) {
    logger.error({ error, fileName: file.name }, 'Vault: AI extraction failed');
    
    // Fill with error values
    for (const col of columns) {
      columnResults[col.id] = {
        value: 'Extraction failed',
        confidence: 'low',
      };
    }
  }

  return {
    fileId: file.id,
    fileName: file.name,
    columns: columnResults,
  };
}

function findBestMatchingChunk(chunks: DocumentChunk[], snippet?: string): DocumentChunk | null {
  if (!chunks.length) return null;
  if (!snippet) return chunks[0] || null;

  const snippetLower = snippet.toLowerCase();
  const words = snippetLower.split(/\W+/).filter((w) => w.length > 2);

  let bestMatch: DocumentChunk | null = null;
  let bestScore = -1;

  for (const chunk of chunks) {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (chunkLower.includes(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = chunk;
    }
  }

  return bestMatch || chunks[0] || null;
}

// ============================================
// ASK QUERY WORKFLOW
// ============================================

export async function runAskQueryWorkflow(
  jobId: string,
  queryId: string,
  files: VaultFileData[],
  question: string
): Promise<AskQueryResult> {
  logger.info({ jobId, queryId, fileCount: files.length, question }, 'Vault: Starting ask query workflow');

  // Update query status to processing
  await db
    .update(vaultQueries)
    .set({ status: 'processing' })
    .where(eq(vaultQueries.id, queryId));

  updateJobProgress(jobId, 0, 1, 'Analyzing documents...');

  // Build context from all files
  const documentContexts = files
    .filter(f => f.extractedText)
    .map(f => `=== ${f.name} ===\n${f.extractedText!.slice(0, 20000)}`)
    .join('\n\n');

  const systemPrompt = `You are a legal document analyst. Answer the user's question based on the provided documents.

Include specific citations to support your answer. For each source, include:
- The file name
- A relevant snippet from that document

If the answer cannot be found in the documents, say so clearly.

Respond ONLY with valid JSON in this format:
{
  "answer": "Your comprehensive answer",
  "sources": [
    {
      "fileName": "document.pdf",
      "snippet": "relevant quote from the document"
    }
  ]
}`;

  const userPrompt = `Documents:
${documentContexts}

Question: ${question}`;

  let answer = '';
  let sources: AskQueryResult['sources'] = [];

  try {
    const parsed = await generateTextWithJsonParsing(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3 }
    );
    answer = parsed.answer || '';
    sources = (parsed.sources || []).map((s: any) => {
      const matchingFile = files.find(f => f.name === s.fileName);
      return {
        fileId: matchingFile?.id || '',
        fileName: s.fileName,
        snippet: s.snippet,
      };
    });

    const queryResult: AskQueryResult = { answer, sources };

    // Update query with results
    await db
      .update(vaultQueries)
      .set({
        status: 'completed',
        results: queryResult as unknown as typeof vaultQueries.$inferInsert.results,
        completedAt: new Date(),
      })
      .where(eq(vaultQueries.id, queryId));

    updateJobProgress(jobId, 1, 1, 'Complete');

    logger.info({ jobId, queryId }, 'Vault: Ask query workflow completed');

    return queryResult;
  } catch (error) {
    logger.error({ error, jobId, queryId }, 'Vault: Ask query failed');

    await db
      .update(vaultQueries)
      .set({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
      .where(eq(vaultQueries.id, queryId));

    throw error;
  }
}
