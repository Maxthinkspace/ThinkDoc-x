import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { llmService } from '@/services/llm';
import type { ThinkClauseRequest, ThinkDocumentRequest, DraftRequest } from '@/schemas/think';

function getUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    // DEV MODE: RETURN MOCK USER ID
    return 'dev-user-1';
  }
  return userId as string;
}

// Helper to build context from annotations
function buildAnnotationsContext(annotations?: ThinkClauseRequest['annotations']): string {
  if (!annotations) return '';
  
  const parts: string[] = [];
  
  if (annotations.trackChanges && annotations.trackChanges.length > 0) {
    parts.push('Track Changes:');
    annotations.trackChanges.forEach((tc, i) => {
      parts.push(`  ${i + 1}. [${tc.type}] ${tc.text}${tc.author ? ` (by ${tc.author})` : ''}`);
    });
  }
  
  if (annotations.comments && annotations.comments.length > 0) {
    parts.push('Comments:');
    annotations.comments.forEach((comment, i) => {
      parts.push(`  ${i + 1}. ${comment.text}${comment.author ? ` (by ${comment.author})` : ''}`);
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach((reply, j) => {
          parts.push(`    Reply ${j + 1}: ${reply}`);
        });
      }
    });
  }
  
  if (annotations.highlights && annotations.highlights.length > 0) {
    parts.push('Highlights:');
    annotations.highlights.forEach((highlight, i) => {
      parts.push(`  ${i + 1}. ${highlight.text}${highlight.color ? ` (${highlight.color})` : ''}`);
    });
  }
  
  return parts.length > 0 ? '\n\nAnnotations:\n' + parts.join('\n') : '';
}

// Think clause handler
const thinkClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as ThinkClauseRequest;

    logger.info(
      { userId, intent: body.intent, clauseTextLength: body.clauseText.length },
      'Think: Processing clause intent'
    );

    const annotationsContext = buildAnnotationsContext(body.annotations);
    
    let prompt = '';
    let responseFormat = '';

    switch (body.intent) {
      case 'risk':
        prompt = `Analyze the following contract clause for potential risks and liabilities. Identify specific risks that could expose the parties to legal, financial, or operational problems.

Clause:
${body.clauseText}${annotationsContext}

Provide a list of specific risks, focusing on:
- Legal exposure
- Financial liability
- Operational risks
- Ambiguities that could be exploited
- Missing protections

Return ONLY a JSON array of risk strings, each describing a specific risk. Example: ["Risk 1", "Risk 2", "Risk 3"]`;
        responseFormat = 'risks';
        break;
        
      case 'compare':
        prompt = `Compare the following contract clause against market standards and best practices. Provide comparisons showing how this clause aligns with or differs from typical agreements.

Clause:
${body.clauseText}${annotationsContext}

Provide comparisons in the format:
- Market Standard: How this compares to typical clauses
- Your Position: Whether this favors buyer/seller/neutral
- Industry Benchmarks: Relevant industry standards

Return ONLY a JSON array of objects with "label" and "value" properties. Example: [{"label": "Market Standard", "value": "..."}, {"label": "Your Position", "value": "..."}]`;
        responseFormat = 'comparisons';
        break;
        
      case 'explain':
        prompt = `Explain the following contract clause in clear, plain language. Break down what it means, its implications, and how it affects the parties.

Clause:
${body.clauseText}${annotationsContext}

Provide a comprehensive explanation that covers:
- What the clause means
- Key terms and their implications
- How it affects each party
- Practical consequences

Return ONLY the explanation text as a string.`;
        responseFormat = 'explanation';
        break;
        
      case 'translate':
        prompt = `Translate the following contract clause to the target language. Maintain legal precision and preserve the meaning of legal terms.

Clause:
${body.clauseText}${annotationsContext}

Return ONLY the translated text as a string.`;
        responseFormat = 'translation';
        break;
    }

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
      maxTokens: 2000,
    });

    let structured: any = {};
    const content = response.content.trim();

    // Try to parse JSON responses
    if (responseFormat === 'risks' || responseFormat === 'comparisons') {
      try {
        const parsed = JSON.parse(content);
        if (responseFormat === 'risks') {
          structured.risks = Array.isArray(parsed) ? parsed : [content];
        } else {
          structured.comparisons = Array.isArray(parsed) ? parsed : [{ label: 'Analysis', value: content }];
        }
      } catch {
        // Fallback if JSON parsing fails
        if (responseFormat === 'risks') {
          structured.risks = content.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
        } else {
          structured.comparisons = [{ label: 'Analysis', value: content }];
        }
      }
    } else {
      structured[responseFormat] = content;
    }

    logger.info({ userId, intent: body.intent }, 'Think: Clause intent completed');

    return c.json({
      success: true,
      type: 'think',
      intent: body.intent,
      content: content,
      structured,
    });
  } catch (error) {
    logger.error({ error }, 'Think: Failed to process clause intent');
    return c.json(
      { success: false, error: 'Failed to process think intent' },
      500
    );
  }
};

// Think document handler
const thinkDocument = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as ThinkDocumentRequest;

    logger.info(
      { userId, intent: body.intent },
      'Think: Processing document intent'
    );

    const docContextStr = [
      body.docContext.title ? `Title: ${body.docContext.title}` : '',
      body.docContext.summary ? `Summary: ${body.docContext.summary}` : '',
      body.docContext.outline && body.docContext.outline.length > 0
        ? `Outline:\n${body.docContext.outline.map(s => `- ${s}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    let prompt = '';
    let responseFormat = '';

    switch (body.intent) {
      case 'overview':
        prompt = `Provide a comprehensive overview of this contract document. Break it down into key sections with summaries.

Document Context:
${docContextStr}

Return a JSON object with:
- summary: A brief overall summary
- sections: Array of objects with "title" and "bullets" (array of strings)

Example: {"summary": "...", "sections": [{"title": "...", "bullets": ["...", "..."]}]}`;
        responseFormat = 'overview';
        break;
        
      case 'key_risks':
        prompt = `Identify key risks in this contract document. Categorize each risk by severity level (red, amber, green).

Document Context:
${docContextStr}

Return a JSON array of objects with:
- level: "red" | "amber" | "green"
- title: Brief risk title
- detail: Detailed description

Example: [{"level": "red", "title": "...", "detail": "..."}]`;
        responseFormat = 'key_risks';
        break;
        
      case 'regulatory':
        prompt = `Identify regulatory and compliance considerations in this contract document. Group by jurisdiction and topic.

Document Context:
${docContextStr}

Return a JSON array of objects with:
- jurisdiction: Optional jurisdiction name
- topic: Regulatory topic
- bullets: Array of compliance points

Example: [{"jurisdiction": "...", "topic": "...", "bullets": ["...", "..."]}]`;
        responseFormat = 'regulatory';
        break;
        
      case 'inconsistencies':
        prompt = `Identify inconsistencies, contradictions, or conflicts within this contract document.

Document Context:
${docContextStr}

Return a JSON array of objects with:
- title: Brief description of inconsistency
- location: Where it appears (sections/references)
- detail: Detailed explanation

Example: [{"title": "...", "location": "...", "detail": "..."}]`;
        responseFormat = 'inconsistencies';
        break;
    }

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

    let structured: any = {};
    const content = response.content.trim();

    try {
      const parsed = JSON.parse(content);
      structured[responseFormat] = parsed;
    } catch {
      // Fallback if JSON parsing fails
      structured[responseFormat] = content;
    }

    logger.info({ userId, intent: body.intent }, 'Think: Document intent completed');

    return c.json({
      success: true,
      type: 'document',
      intent: body.intent,
      content: content,
      structured,
    });
  } catch (error) {
    logger.error({ error }, 'Think: Failed to process document intent');
    return c.json(
      { success: false, error: 'Failed to process document intent' },
      500
    );
  }
};

// Draft handler
const draft = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as DraftRequest;

    logger.info(
      { userId, intent: body.intent, clauseTextLength: body.clauseText.length },
      'Draft: Processing draft intent'
    );

    const annotationsContext = buildAnnotationsContext(body.annotations);
    
    let perspective = '';
    switch (body.intent) {
      case 'buyer':
        perspective = 'buyer-friendly perspective, protecting buyer interests';
        break;
      case 'seller':
        perspective = 'seller-friendly perspective, protecting seller interests';
        break;
      case 'fallback':
        perspective = 'balanced perspective with fallback options and alternatives';
        break;
      case 'clean':
        perspective = 'clean, concise, and unambiguous language';
        break;
    }

    const prompt = `Rewrite the following contract clause from a ${perspective}. Maintain legal precision while improving clarity and alignment with the intended perspective.

Original Clause:
${body.clauseText}${annotationsContext}

${body.intent === 'fallback' ? 'Provide the main rewritten clause, followed by alternative fallback options.' : 'Provide the rewritten clause.'}

${body.intent === 'fallback' ? 'Return a JSON object with "alternativeWording" (string) and "fallbacks" (array of strings).' : 'Return ONLY the rewritten clause text as a string.'}`;

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
      temperature: 0.5,
      maxTokens: 2000,
    });

    const content = response.content.trim();
    let alternativeWording = content;
    let fallbacks: string[] | undefined;

    if (body.intent === 'fallback') {
      try {
        const parsed = JSON.parse(content);
        alternativeWording = parsed.alternativeWording || content;
        fallbacks = Array.isArray(parsed.fallbacks) ? parsed.fallbacks : undefined;
      } catch {
        // If not JSON, use content as is
      }
    }

    logger.info({ userId, intent: body.intent }, 'Draft: Draft intent completed');

    return c.json({
      success: true,
      type: 'draft',
      intent: body.intent,
      alternativeWording,
      fallbacks,
      notes: `Drafted with ${body.intent} perspective in mind`,
    });
  } catch (error) {
    logger.error({ error }, 'Draft: Failed to process draft intent');
    return c.json(
      { success: false, error: 'Failed to process draft intent' },
      500
    );
  }
};

export const thinkController = {
  thinkClause,
  thinkDocument,
  draft,
};

