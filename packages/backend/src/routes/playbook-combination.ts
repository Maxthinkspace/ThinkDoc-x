import { Hono } from 'hono';
import {
  compareRulesForCombination,
  mergeOverlappingRules,
  CompareRulesRequest,
  MergeRulesRequest,
} from '@/services/playbook-combination';
import { logger } from '@/config/logger';

export const playbookCombinationRoutes = new Hono();

/**
 * POST /api/playbook-combination/compare-rules
 * Compare rules between playbooks to find overlaps and conflicts
 */
playbookCombinationRoutes.post('/compare-rules', async (c) => {
  try {
    const request: CompareRulesRequest = await c.req.json();

    if (!request.baseRules || !request.comparisonRules) {
      return c.json({
        success: false,
        error: {
          message: 'Both baseRules and comparisonRules are required',
          code: 'INVALID_REQUEST',
        },
      }, 400);
    }

    const result = await compareRulesForCombination(request);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error in compare-rules endpoint');
    return c.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to compare rules',
        code: 'COMPARISON_ERROR',
      },
    }, 500);
  }
});

/**
 * POST /api/playbook-combination/merge-rules
 * Merge overlapping rules into a single rule using LLM
 */
playbookCombinationRoutes.post('/merge-rules', async (c) => {
  try {
    const request: MergeRulesRequest = await c.req.json();

    if (!request.rules || request.rules.length === 0) {
      return c.json({
        success: false,
        error: {
          message: 'At least one rule is required for merging',
          code: 'INVALID_REQUEST',
        },
      }, 400);
    }

    const mergedRule = await mergeOverlappingRules(request);

    return c.json({
      success: true,
      data: {
        mergedRule,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error in merge-rules endpoint');
    return c.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to merge rules',
        code: 'MERGE_ERROR',
      },
    }, 500);
  }
});