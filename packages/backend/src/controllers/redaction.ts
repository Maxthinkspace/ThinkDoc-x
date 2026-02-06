import type { Context } from 'hono';
import { logger } from '@/config/logger';
import {
  suggestRedactionTerms,
  buildDocumentText,
} from '@/services/redaction';
import type { SectionNode } from '@/types/documents';

// ============================================
// Controller: Suggest Redaction Terms
// ============================================

/**
 * POST /suggest-terms
 *
 * Accepts a parsed document (structure + recitals), builds the plain text,
 * and calls the LLM to identify deal-specific terms to redact.
 *
 * Request body:
 * {
 *   structure: SectionNode[],
 *   recitals?: string,
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   terms: RedactionTerm[],
 *   error?: string,
 * }
 */
export async function suggestTerms(c: Context) {
  try {
    const body = await c.req.json();

    logger.info({
      hasStructure: !!body.structure,
      hasRecitals: !!body.recitals,
    }, 'Redaction controller: suggestTerms called');

    // Validate
    if (!body.structure || !Array.isArray(body.structure)) {
      return c.json({
        success: false,
        terms: [],
        error: 'Missing required field: structure (array of SectionNode)',
      }, 400);
    }

    const structure: SectionNode[] = body.structure;
    const recitals: string = body.recitals || '';

    // Build document text
    const documentText = buildDocumentText(structure, recitals);

    if (documentText.trim().length < 50) {
      return c.json({
        success: true,
        terms: [],
        message: 'Document too short for meaningful redaction analysis.',
      });
    }

    // Call LLM
    const result = await suggestRedactionTerms({ documentText });

    return c.json({
      success: true,
      terms: result.terms,
    });
  } catch (error) {
    logger.error({ error }, 'Redaction controller: suggestTerms failed');
    return c.json({
      success: false,
      terms: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}

export const redactionController = {
  suggestTerms,
};
