import { logger } from '@/config/logger';
import { parseDocument } from './vault/documentParser';

/**
 * Document chunk with position metadata for citation highlighting
 */
export interface DocumentChunk {
  text: string;
  paragraphIndex: number;
  pageNumber?: number; // For PDFs
  highlightBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
  };
  chunkIndex: number;
}

/**
 * Chunk a document into paragraphs with position metadata
 * Based on thinkstudio-master's chunking logic
 */
export class DocumentChunkingService {
  private readonly CHUNK_SIZE = 800;

  /**
   * Chunk a document buffer into paragraphs with metadata
   */
  async chunkDocument(
    buffer: Buffer,
    fileName: string,
    mimeType?: string
  ): Promise<DocumentChunk[]> {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    try {
      if (extension === 'pdf' || mimeType?.includes('pdf')) {
        return await this.chunkPDF(buffer, fileName);
      } else if (extension === 'docx' || extension === 'doc' || mimeType?.includes('word')) {
        return await this.chunkDOCX(buffer, fileName);
      } else {
        // TXT, MD, or other text files
        return await this.chunkText(buffer, fileName);
      }
    } catch (error) {
      logger.error({ error, fileName }, 'Document chunking failed');
      return [];
    }
  }

  /**
   * Chunk already-extracted text (used when raw file buffer is unavailable).
   */
  chunkExtractedText(text: string, fileName: string): DocumentChunk[] {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    if (extension === 'pdf') {
      return this.chunkPdfText(text);
    }
    return this.chunkPlainText(text);
  }

  /**
   * Chunk PDF with page numbers and bounding boxes
   */
  private async chunkPDF(buffer: Buffer, fileName: string): Promise<DocumentChunk[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let PDFParse: any;
    try {
      // pdf-parse v2.x exports PDFParse class
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdfParseModule = require('pdf-parse');
      PDFParse = pdfParseModule.PDFParse;
      
      if (typeof PDFParse !== 'function') {
        logger.error('pdf-parse module does not export PDFParse class');
        return [];
      }
    } catch (error) {
      logger.error({ error }, 'pdf-parse package not installed or failed to import');
      return [];
    }

    // Convert Buffer to Uint8Array for pdf-parse v2.x
    const data = new Uint8Array(buffer);
    const parser = new PDFParse({ data });
    
    // Get text content
    const textResult = await parser.getText();
    const text = textResult.text || '';
    
    // Clean up
    await parser.destroy();

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // pdf-parse doesn't provide detailed bounding boxes by default
    // We'll use page-based chunking and approximate positions
    const pages = text.split(/\f/).filter((p: string) => p.trim());
    
    pages.forEach((pageText: string, pageIdx: number) => {
      const pageNumber = pageIdx + 1;
      const paragraphs = pageText.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);

      paragraphs.forEach((para: string, paraIdx: number) => {
        // If paragraph is too long, split it
        let start = 0;
        while (start < para.length) {
          const chunkText = para.slice(start, start + this.CHUNK_SIZE);
          
          chunks.push({
            text: chunkText,
            paragraphIndex: paraIdx + 1,
            pageNumber,
            highlightBox: {
              // Approximate bounding box - pdf-parse doesn't provide exact positions
              // These will be refined if we have better PDF parsing
              x: 0,
              y: paraIdx * 20, // Approximate Y position
              width: 500,
              height: Math.min(20, chunkText.split('\n').length * 20),
              pageWidth: 612, // Standard US Letter width in points
              pageHeight: 792, // Standard US Letter height in points
            },
            chunkIndex: chunkIndex++,
          });

          start += this.CHUNK_SIZE;
        }
      });
    });

    return chunks;
  }

  /**
   * Chunk DOCX/DOC with paragraph indices
   */
  private async chunkDOCX(buffer: Buffer, fileName: string): Promise<DocumentChunk[]> {
    const parsed = await parseDocument(buffer, fileName);
    const text = parsed.text;

    if (!text || !text.trim()) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);

    if (paragraphs.length > 1) {
      // Multiple paragraphs - chunk each paragraph
      paragraphs.forEach((para: string, idx: number) => {
        let start = 0;
        while (start < para.length) {
          chunks.push({
            text: para.slice(start, start + this.CHUNK_SIZE),
            paragraphIndex: idx + 1,
            chunkIndex: chunkIndex++,
          });
          start += this.CHUNK_SIZE;
        }
      });
    } else {
      // Single paragraph or no clear paragraphs - use sentence-level chunking
      const sentences = text.split(/(?<=[.?!])\s+/).map((s: string) => s.trim()).filter(Boolean);
      sentences.forEach((sentence: string, idx: number) => {
        chunks.push({
          text: sentence,
          paragraphIndex: idx + 1,
          chunkIndex: chunkIndex++,
        });
      });
    }

    return chunks;
  }

  /**
   * Chunk plain text files
   */
  private chunkText(buffer: Buffer, fileName: string): DocumentChunk[] {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    const paragraphs = text.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);

    if (paragraphs.length > 1) {
      paragraphs.forEach((para: string, idx: number) => {
        let start = 0;
        while (start < para.length) {
          chunks.push({
            text: para.slice(start, start + this.CHUNK_SIZE),
            paragraphIndex: idx + 1,
            chunkIndex: chunkIndex++,
          });
          start += this.CHUNK_SIZE;
        }
      });
    } else {
      // Sentence-level fallback
      const sentences = text.split(/(?<=[.?!])\s+/).map((s: string) => s.trim()).filter(Boolean);
      sentences.forEach((sentence: string, idx: number) => {
        chunks.push({
          text: sentence,
          paragraphIndex: idx + 1,
          chunkIndex: chunkIndex++,
        });
      });
    }

    return chunks;
  }

  private chunkPdfText(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    const pages = text.split(/\f/).filter((p: string) => p.trim());
    const pageTexts = pages.length > 0 ? pages : [text];

    pageTexts.forEach((pageText: string, pageIdx: number) => {
      const pageNumber = pageIdx + 1;
      const paragraphs = pageText.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);
      const pageParas = paragraphs.length > 0 ? paragraphs : [pageText.trim()];

      pageParas.forEach((para: string, paraIdx: number) => {
        if (!para) return;
        let start = 0;
        while (start < para.length) {
          const chunkText = para.slice(start, start + this.CHUNK_SIZE);
          chunks.push({
            text: chunkText,
            paragraphIndex: paraIdx + 1,
            pageNumber,
            highlightBox: {
              x: 0,
              y: paraIdx * 20,
              width: 500,
              height: Math.min(20, chunkText.split('\n').length * 20),
              pageWidth: 612,
              pageHeight: 792,
            },
            chunkIndex: chunkIndex++,
          });
          start += this.CHUNK_SIZE;
        }
      });
    });

    return chunks;
  }

  private chunkPlainText(text: string): DocumentChunk[] {
    const cleaned = text.trim();
    if (!cleaned) return [];

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    const paragraphs = cleaned.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);

    if (paragraphs.length > 1) {
      paragraphs.forEach((para: string, idx: number) => {
        let start = 0;
        while (start < para.length) {
          chunks.push({
            text: para.slice(start, start + this.CHUNK_SIZE),
            paragraphIndex: idx + 1,
            chunkIndex: chunkIndex++,
          });
          start += this.CHUNK_SIZE;
        }
      });
    } else {
      const sentences = cleaned.split(/(?<=[.?!])\s+/).map((s: string) => s.trim()).filter(Boolean);
      sentences.forEach((sentence: string, idx: number) => {
        chunks.push({
          text: sentence,
          paragraphIndex: idx + 1,
          chunkIndex: chunkIndex++,
        });
      });
    }

    return chunks;
  }

  /**
   * Select relevant chunks based on question keywords
   * Similar to thinkstudio's selectRelevantSentences
   */
  selectRelevantChunks(question: string, chunks: DocumentChunk[], max: number = 6): DocumentChunk[] {
    const qWords = (question || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((w: string) => w.length > 2);

    return chunks
      .map((chunk) => {
        const score = qWords.reduce(
          (acc: number, w: string) => acc + (chunk.text.toLowerCase().includes(w) ? 1 : 0),
          0
        );
        return { ...chunk, score };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
  }
}

export const documentChunkingService = new DocumentChunkingService();

