import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import { llmService } from '@/services/llm';

function getUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    // DEV MODE: RETURN MOCK USER ID
    return 'dev-user-1';
  }
  return userId as string;
}

const analyzeNegotiation = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as {
      position: string;
      instructions: string[];
      text: string;
      structure?: any;
      reference?: {
        type: 'clause' | 'playbook' | 'project';
        data: any;
      } | null;
    };

    if (!body.position || !body.instructions || body.instructions.length === 0 || !body.text) {
      return c.json({ success: false, error: 'Position, instructions, and text are required' }, 400);
    }

    logger.info({ 
      userId, 
      position: body.position,
      instructionCount: body.instructions.length,
      textLength: body.text.length,
      hasReference: !!body.reference,
    }, 'Negotiation: Starting analysis');

    // Build context from structure if provided
    let structureContext = '';
    if (body.structure && Array.isArray(body.structure)) {
      structureContext = '\n\nDocument Structure:\n' + JSON.stringify(body.structure, null, 2);
    }

    // Build reference context if provided
    let referenceContext = '';
    if (body.reference) {
      referenceContext = `\n\nReference ${body.reference.type}:\n${JSON.stringify(body.reference.data, null, 2)}`;
    }

    // Build negotiation instructions context
    const instructionsText = body.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');

    const prompt = `You are a contract negotiation advisor. Analyze the following contract text from the perspective of a ${body.position} and suggest amendments based on the negotiation instructions provided.

Contract Text:
${body.text}${structureContext}${referenceContext}

Negotiation Instructions:
${instructionsText}

Your Position: ${body.position}

Analyze the contract and provide suggested amendments. For each amendment:
1. Identify the section or clause that needs modification
2. Provide the original text
3. Suggest the amended text
4. Explain the reasoning based on the negotiation instructions and your position
5. Assign a priority level (high, medium, low)

Return a JSON object with:
- amendments: Array of objects with:
  - section: Section identifier or description
  - originalText: The original text to be amended
  - suggestedAmendment: The suggested amended text
  - reasoning: Explanation of why this amendment is needed
  - priority: "high" | "medium" | "low"
- summary: Object with:
  - totalAmendments: Total number of amendments
  - highPriority: Count of high priority amendments
  - mediumPriority: Count of medium priority amendments
  - lowPriority: Count of low priority amendments

Example format:
{
  "amendments": [
    {
      "section": "Section 3.2",
      "originalText": "...",
      "suggestedAmendment": "...",
      "reasoning": "...",
      "priority": "high"
    }
  ],
  "summary": {
    "totalAmendments": 1,
    "highPriority": 1,
    "mediumPriority": 0,
    "lowPriority": 0
  }
}`;

    const response = await llmService.generate({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: {
        provider: 'azure',
        model: 'gpt-4o',
        deployment: 'gpt-4o',
      },
      temperature: 0.4,
      maxTokens: 4000,
    });

    let result;
    try {
      result = JSON.parse(response.content.trim());
    } catch (parseError) {
      // Fallback if JSON parsing fails
      logger.warn({ parseError }, 'Negotiation: Failed to parse LLM response as JSON');
      result = {
        amendments: [
          {
            section: 'General',
            originalText: body.text.substring(0, 200) + '...',
            suggestedAmendment: response.content.trim(),
            reasoning: 'Analysis based on negotiation instructions',
            priority: 'medium' as const,
          },
        ],
        summary: {
          totalAmendments: 1,
          highPriority: 0,
          mediumPriority: 1,
          lowPriority: 0,
        },
      };
    }

    // Ensure result has required structure
    if (!result.amendments || !Array.isArray(result.amendments)) {
      result.amendments = [];
    }
    if (!result.summary) {
      result.summary = {
        totalAmendments: result.amendments.length,
        highPriority: result.amendments.filter((a: any) => a.priority === 'high').length,
        mediumPriority: result.amendments.filter((a: any) => a.priority === 'medium').length,
        lowPriority: result.amendments.filter((a: any) => a.priority === 'low').length,
      };
    }

    logger.info({ 
      userId, 
      position: body.position,
      amendmentCount: result.amendments.length,
    }, 'Negotiation: Analysis completed');

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze negotiation';
    logger.error({ error, errorMessage }, 'Negotiation: Failed to analyze negotiation');
    const exposeError = env.NODE_ENV !== 'production' || process.env.EXPOSE_LLM_ERRORS === 'true';
    return c.json({
      success: false,
      error: exposeError ? errorMessage : 'Failed to analyze negotiation',
    }, 500);
  }
};

export const negotiationController = {
  analyzeNegotiation,
};

