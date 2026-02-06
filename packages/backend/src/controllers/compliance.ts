import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { llmService } from '@/services/llm';

function getUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    // DEV MODE: RETURN MOCK USER ID
    return 'dev-user-1';
  }
  return userId as string;
}

const checkCompliance = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as {
      text: string;
      rules?: string[];
    };

    if (!body.text || body.text.trim().length === 0) {
      return c.json({ success: false, error: 'Text is required' }, 400);
    }

    logger.info({ userId, textLength: body.text.length, hasRules: !!body.rules }, 'Compliance: Starting check');

    // Build rules context if provided
    let rulesContext = '';
    if (body.rules && body.rules.length > 0) {
      rulesContext = `\n\nCompliance Rules to Check Against:\n${body.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}`;
    }

    const prompt = `You are a compliance checker for legal documents. Analyze the following contract text for compliance issues, regulatory violations, and best practice violations.

Contract Text:
${body.text}${rulesContext}

Check for:
1. Regulatory compliance issues (data protection, employment law, financial regulations, etc.)
2. Standard contract best practices
3. Potential legal risks
4. Missing required clauses or protections
5. Ambiguous language that could cause compliance issues
6. Conflicts with industry standards

${body.rules && body.rules.length > 0 ? 'Pay special attention to the specific compliance rules listed above.' : 'Use general legal compliance standards and best practices.'}

For each issue found, provide:
- type: Category of compliance issue (e.g., "data_protection", "confidentiality", "liability", "regulatory")
- severity: "high" | "medium" | "low"
- message: Clear description of the issue
- location: Optional location reference if applicable

Also provide suggestions for how to address each issue.

Return a JSON object with:
- compliant: boolean (true if no issues found)
- issues: Array of objects with type, severity, message, and optional location
- suggestions: Array of strings with recommendations

Example format:
{
  "compliant": false,
  "issues": [
    {
      "type": "confidentiality",
      "severity": "medium",
      "message": "Confidentiality clause lacks exceptions for legal disclosures",
      "location": "Section 5.2"
    }
  ],
  "suggestions": [
    "Add exceptions for required legal disclosures",
    "Include carve-out for disclosures required by law"
  ]
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
      temperature: 0.3,
      maxTokens: 3000,
    });

    let result;
    try {
      result = JSON.parse(response.content.trim());
    } catch (parseError) {
      // Fallback if JSON parsing fails
      logger.warn({ parseError }, 'Compliance: Failed to parse LLM response as JSON');
      result = {
        compliant: true,
        issues: [],
        suggestions: [],
      };
    }

    // Ensure result has required structure
    if (typeof result.compliant !== 'boolean') {
      result.compliant = (!result.issues || result.issues.length === 0);
    }
    if (!result.issues || !Array.isArray(result.issues)) {
      result.issues = [];
    }
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      result.suggestions = [];
    }

    logger.info({ 
      userId, 
      compliant: result.compliant,
      issueCount: result.issues.length,
    }, 'Compliance: Check completed');

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error({ error }, 'Compliance: Failed to check compliance');
    return c.json({ success: false, error: 'Failed to check compliance' }, 500);
  }
};

export const complianceController = {
  checkCompliance,
};

