import { llmService } from './llm';
import { tavilyService } from './tavily';
import { db } from '@/config/database';
import { vaultFiles, vaultClauses } from '@/db/schema/vault';
import { playbooks } from '@/db/schema/tables';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '@/config/logger';
import { clauseService } from './clause-service';
import { playbookService } from './playbook-service';
import { documentChunkingService, type DocumentChunk } from './document-chunking';
import { getFileFromStorage } from './storage';
import type {
  AskRequest,
  AskSourceConfig,
} from '@/schemas/ask';
import type {
  AskStreamEvent,
  AskContext,
  SourceCitation,
  Message as AskMessage,
} from '@/types/ask';
import type { Message } from '@/types/llm';
import { sessionCache } from './sessionCache';

type StreamCallback = (event: AskStreamEvent) => void;

export class AskService {
  private citationCounter = 0;
  private citations: Map<number, SourceCitation> = new Map();
  // Store chunks per file for citation matching
  private fileChunks: Map<string, DocumentChunk[]> = new Map();

  /**
   * Main entry point for ask workflow with streaming
   */
  async *processAsk(
    request: AskRequest,
    userId: string
  ): AsyncGenerator<AskStreamEvent, void, unknown> {
    this.citationCounter = 0;
    this.citations.clear();

    const totalSteps = 5;
    let currentStep = 0;

    try {
      // Step 1: Query Analysis
      currentStep = 1;
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Analyzing query...',
        status: 'started',
      };

      const queryAnalysis = await this.analyzeQuery(request.question);
      
      yield {
        type: 'thinking',
        content: queryAnalysis.thinking,
      };

      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Analyzing query...',
        status: 'completed',
      };

      // Step 2: Source Gathering
      currentStep = 2;
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Gathering sources...',
        status: 'started',
      };

      const context = await this.gatherSources(request, userId);
      
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Gathering sources...',
        status: 'completed',
      };

      // Step 3: Context Building
      currentStep = 3;
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Building context...',
        status: 'started',
      };

      const rankedContext = await this.rankAndSelectContext(
        request.question,
        context,
        queryAnalysis.intent
      );

      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Building context...',
        status: 'completed',
      };

      // Step 4: Answer Generation (Streaming)
      currentStep = 4;
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Generating answer...',
        status: 'started',
      };

      yield* this.generateAnswer(
        request,
        rankedContext,
        queryAnalysis.intent
      );

      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Generating answer...',
        status: 'completed',
      };

      // Step 5: Follow-up Generation
      currentStep = 5;
      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Generating follow-up questions...',
        status: 'started',
      };

      const followUps = await this.generateFollowUpQuestions(
        request.question,
        rankedContext
      );

      yield {
        type: 'follow_up',
        questions: followUps,
      };

      yield {
        type: 'workflow_step',
        step: currentStep,
        total: totalSteps,
        name: 'Generating follow-up questions...',
        status: 'completed',
      };

      yield { type: 'done' };
    } catch (error) {
      logger.error({ error, request }, 'Ask service error');
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Analyze query to understand intent and requirements
   */
  private async analyzeQuery(question: string): Promise<{
    intent: string;
    thinking: string;
  }> {
    const systemPrompt = `You are an expert legal research assistant. Analyze the user's question to understand:
1. The type of information they're seeking
2. What sources would be most relevant
3. The complexity and scope of the question

Respond with a JSON object:
{
  "intent": "brief description of what they're asking",
  "thinking": "your analysis of the question and approach"
}`;

    const model = 'gpt-4o-mini';
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    logger.info(
      { model, messages },
      'Ask - Analyze Query: Full prompt'
    );

    try {
      const response = await llmService.generate({
        model: {
          provider: 'azure',
          model: 'gpt-4o-mini',
          deployment: 'gpt-4o-mini',
        },
        messages,
        temperature: 0.3,
      });

      logger.info(
        { rawResponse: response.content },
        'Ask - Analyze Query: Full LLM response'
      );

      const parsed = this.parseJsonResponse(response.content);

      return {
        intent: parsed.intent || 'general inquiry',
        thinking: parsed.thinking || 'Analyzing the question to provide a comprehensive answer.',
      };
    } catch (error) {
      logger.error({ error }, 'Query analysis failed');
      return {
        intent: 'general inquiry',
        thinking: 'Analyzing the question to provide a comprehensive answer.',
      };
    }
  }

  /**
   * Gather sources from all configured locations
   */
  private async gatherSources(
    request: AskRequest,
    userId: string
  ): Promise<AskContext> {
    const context: AskContext = {
      vaultFiles: [],
      vaultPlaybooks: [],
      vaultClauses: [],
      webResults: [],
    };

    const promises: Promise<void>[] = [];

    // Gather document context
    if (request.sourceConfig.includeDocument && request.sourceConfig.documentContext) {
      context.documentContext = request.sourceConfig.documentContext;
    }

    // Handle session-cached full document
    if (request.sourceConfig.sessionId) {
      const cachedDocument = sessionCache.getOrSet(
        request.sourceConfig.sessionId,
        userId,  // Now requires userId for security
        request.sourceConfig.fullDocument
      );
      
      if (cachedDocument) {
        if (!context.documentContext) {
          // Use cached document as document context if none provided
          context.documentContext = cachedDocument;
        } else {
          // Append full document to existing context
          context.documentContext = `${context.documentContext}\n\n=== FULL DOCUMENT ===\n${cachedDocument}`;
        }
      }
    }

    // Handle selection context (prepend to document context for prominence)
    if (request.sourceConfig.selectionContext) {
      const selectionPrefix = `=== SELECTED TEXT CONTEXT ===\nThe user has selected the following text in their document. Pay special attention to this selection when answering their question.\n\n${request.sourceConfig.selectionContext}\n\n=== END SELECTION ===\n\n`;
      context.documentContext = context.documentContext 
        ? selectionPrefix + context.documentContext
        : selectionPrefix;
      
      // Ensure includeDocument behavior even if not explicitly set
      if (!context.documentContext) {
        context.documentContext = selectionPrefix;
      }
    }

    // Gather vault files
    if (request.sourceConfig.vaultFileIds && request.sourceConfig.vaultFileIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const files = await db
              .select({
                id: vaultFiles.id,
                name: vaultFiles.name,
                extractedText: vaultFiles.extractedText,
                storagePath: vaultFiles.storagePath,
                mimeType: vaultFiles.mimeType,
              })
              .from(vaultFiles)
              .where(inArray(vaultFiles.id, request.sourceConfig.vaultFileIds!));

            context.vaultFiles = files
              .filter(f => f.extractedText)
              .map(f => ({
                id: f.id,
                name: f.name,
                content: f.extractedText!,
              }));

            // Chunk vault files for citation highlighting
            for (const file of files) {
              if (file.storagePath && file.mimeType) {
                try {
                  const buffer = await getFileFromStorage(file.storagePath);
                  const chunks = await documentChunkingService.chunkDocument(
                    buffer,
                    file.name,
                    file.mimeType
                  );
                  this.fileChunks.set(file.id, chunks);
                  logger.info(
                    { fileId: file.id, chunkCount: chunks.length },
                    'Chunked vault file for citations'
                  );
                } catch (error) {
                  logger.warn({ error, fileId: file.id }, 'Failed to chunk vault file');
                }
              }
            }
          } catch (error) {
            logger.error({ error }, 'Failed to fetch vault files');
          }
        })()
      );
    }

    // Gather vault playbooks
    if (request.sourceConfig.vaultPlaybookIds && request.sourceConfig.vaultPlaybookIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const playbookList = await db
              .select({
                id: playbooks.id,
                playbookName: playbooks.playbookName,
                rules: playbooks.rules,
              })
              .from(playbooks)
              .where(
                and(
                  eq(playbooks.userId, userId),
                  inArray(playbooks.id, request.sourceConfig.vaultPlaybookIds!),
                  eq(playbooks.isActive, true)
                )
              );

            context.vaultPlaybooks = playbookList.map(p => ({
              id: p.id,
              name: p.playbookName,
              content: JSON.stringify(p.rules),
            }));
          } catch (error) {
            logger.error({ error }, 'Failed to fetch vault playbooks');
          }
        })()
      );
    }

    // Gather vault clauses (legacy)
    if (request.sourceConfig.vaultClauseIds && request.sourceConfig.vaultClauseIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const clauses = await db
              .select({
                id: vaultClauses.id,
                name: vaultClauses.name,
                text: vaultClauses.text,
              })
              .from(vaultClauses)
              .where(
                and(
                  eq(vaultClauses.userId, userId),
                  inArray(vaultClauses.id, request.sourceConfig.vaultClauseIds!)
                )
              );

            context.vaultClauses = clauses.map(c => ({
              id: c.id,
              name: c.name,
              content: c.text,
            }));
          } catch (error) {
            logger.error({ error }, 'Failed to fetch vault clauses');
          }
        })()
      );
    }

    // Gather clauses from new library structure
    if (request.sourceConfig.clauseIds && request.sourceConfig.clauseIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const clausePromises = request.sourceConfig.clauseIds!.map((id: string) => clauseService.getClauseById(userId, id));
            const clauses = await Promise.all(clausePromises);
            const validClauses = clauses.filter((c): c is NonNullable<typeof c> => c !== null);

            if (!context.vaultClauses) {
              context.vaultClauses = [];
            }

            for (const clause of validClauses) {
              if (clause.currentVersion) {
                context.vaultClauses.push({
                  id: clause.id,
                  name: clause.name,
                  content: clause.currentVersion.text,
                });
              }
            }

            // Record usage
            for (const clause of validClauses) {
              await clauseService.recordUsage(userId, clause.id).catch(err => {
                logger.error({ error: err, clauseId: clause.id }, 'Failed to record clause usage');
              });
            }
          } catch (error) {
            logger.error({ error }, 'Failed to fetch clauses from library');
          }
        })()
      );
    }

    // Gather clauses by tags
    if (request.sourceConfig.clauseTagIds && request.sourceConfig.clauseTagIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const result = await clauseService.listClauses(userId, {
              ...(request.sourceConfig.clauseTagIds ? { tagIds: request.sourceConfig.clauseTagIds } : {}),
              limit: 50, // Limit to prevent too many clauses
            });

            if (!context.vaultClauses) {
              context.vaultClauses = [];
            }

            for (const clause of result.clauses) {
              if (clause.currentVersion) {
                context.vaultClauses.push({
                  id: clause.id,
                  name: clause.name,
                  content: clause.currentVersion.text,
                });
              }
            }
          } catch (error) {
            logger.error({ error }, 'Failed to fetch clauses by tags');
          }
        })()
      );
    }

    // Gather playbooks from new library structure
    if (request.sourceConfig.playbookIds && request.sourceConfig.playbookIds.length > 0) {
      promises.push(
        (async () => {
          try {
            const playbookPromises = request.sourceConfig.playbookIds!.map((id: string) => playbookService.getPlaybookById(userId, id));
            const playbooksList = await Promise.all(playbookPromises);
            const validPlaybooks = playbooksList.filter((p): p is NonNullable<typeof p> => p !== null);

            if (!context.vaultPlaybooks) {
              context.vaultPlaybooks = [];
            }

            for (const playbook of validPlaybooks) {
              if (playbook.rules && playbook.rules.length > 0) {
                // Convert normalized rules back to JSON structure for compatibility
                const rulesJson = {
                  instructionRequestRules: playbook.rules.filter((r: { ruleType: string }) => r.ruleType === 'instruction_request'),
                  alwaysAppliedRules: playbook.rules.filter((r: { ruleType: string }) => r.ruleType === 'amendment_always'),
                  conditionalRules: playbook.rules.filter((r: { ruleType: string }) => r.ruleType === 'amendment_conditional'),
                };

                context.vaultPlaybooks.push({
                  id: playbook.id,
                  name: playbook.name,
                  content: JSON.stringify(rulesJson),
                });
              }
            }

            // Record usage
            for (const playbook of validPlaybooks) {
              await playbookService.recordUsage(userId, playbook.id).catch(err => {
                logger.error({ error: err, playbookId: playbook.id }, 'Failed to record playbook usage');
              });
            }
          } catch (error) {
            logger.error({ error }, 'Failed to fetch playbooks from library');
          }
        })()
      );
    }

    // Gather web search results
    if (request.sourceConfig.enableWebSearch && tavilyService.isAvailable()) {
      promises.push(
        (async () => {
          try {
            const webResults = await tavilyService.search(request.question, 5);
            context.webResults = webResults.map(r => ({
              title: r.title,
              url: r.url,
              content: r.content,
              snippet: r.content.substring(0, 500),
            }));
          } catch (error) {
            logger.error({ error }, 'Web search failed');
          }
        })()
      );
    }

    await Promise.all(promises);
    return context;
  }

  /**
   * Rank and select most relevant context passages
   */
  private async rankAndSelectContext(
    question: string,
    context: AskContext,
    intent: string
  ): Promise<AskContext> {
    // For now, return all context - could be enhanced with LLM-based ranking
    // Limit content size to avoid token limits
    const maxContentLength = 50000;

    const ranked: AskContext = {
      ...(context.documentContext
        ? { documentContext: context.documentContext.substring(0, 10000) }
        : {}),
      vaultFiles: context.vaultFiles.map(f => ({
        ...f,
        content: f.content.substring(0, 20000),
      })),
      vaultPlaybooks: context.vaultPlaybooks.map(p => ({
        ...p,
        content: p.content.substring(0, 20000),
      })),
      vaultClauses: context.vaultClauses.map(c => ({
        ...c,
        content: c.content.substring(0, 10000),
      })),
      webResults: context.webResults.map(r => ({
        ...r,
        content: r.content.substring(0, 5000),
        snippet: r.snippet.substring(0, 500),
      })),
    };

    return ranked;
  }

  /**
   * Detect if a query is a simple greeting or small talk that doesn't require citations
   */
  private isSimpleQuery(question: string, context: AskContext): boolean {
    const normalizedQuestion = question.toLowerCase().trim();
    
    // Check if there's any actual context to cite
    const hasContext = !!(
      context.documentContext ||
      context.vaultFiles.length > 0 ||
      context.vaultPlaybooks.length > 0 ||
      context.vaultClauses.length > 0 ||
      context.webResults.length > 0
    );
    
    // If there's context, always use citations (user might be asking about the context)
    if (hasContext) {
      return false;
    }
    
    // Simple greeting patterns
    const greetingPatterns = [
      /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.,]*$/i,
      /^(thanks|thank you|thx)[\s!.,]*$/i,
      /^(ok|okay|sure|alright|got it)[\s!.,]*$/i,
      /^(yes|no|yep|nope)[\s!.,]*$/i,
    ];
    
    // Check if it's a simple greeting
    if (greetingPatterns.some(pattern => pattern.test(normalizedQuestion))) {
      return true;
    }
    
    // Very short queries (less than 10 characters) without question words are likely simple
    if (normalizedQuestion.length < 10 && !/[?]/.test(normalizedQuestion)) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate answer with streaming and citations
   */
  private async *generateAnswer(
    request: AskRequest,
    context: AskContext,
    intent: string
  ): AsyncGenerator<AskStreamEvent, void, unknown> {
    // Build context string
    const contextParts: string[] = [];

    if (context.documentContext) {
      contextParts.push(`=== Current Document ===\n${context.documentContext}`);
    }

    if (context.vaultFiles.length > 0) {
      context.vaultFiles.forEach((file, idx) => {
        contextParts.push(`=== Vault File ${idx + 1}: ${file.name} ===\n${file.content}`);
      });
    }

    if (context.vaultPlaybooks.length > 0) {
      context.vaultPlaybooks.forEach((playbook, idx) => {
        contextParts.push(`=== Playbook ${idx + 1}: ${playbook.name} ===\n${playbook.content}`);
      });
    }

    if (context.vaultClauses.length > 0) {
      context.vaultClauses.forEach((clause, idx) => {
        contextParts.push(`=== Clause ${idx + 1}: ${clause.name} ===\n${clause.content}`);
      });
    }

    if (context.webResults.length > 0) {
      context.webResults.forEach((result, idx) => {
        contextParts.push(`=== Web Source ${idx + 1}: ${result.title} ===\nURL: ${result.url}\n${result.content}`);
      });
    }

    const fullContext = contextParts.join('\n\n');

    // Check if this is a simple query that doesn't need citations
    const isSimple = this.isSimpleQuery(request.question, context);
    
    const systemPrompt = isSimple
      ? `You are an expert legal research assistant. Answer the user's question in a friendly and helpful manner. Keep your response concise and conversational. Do not include citations or citation sections.`
      : `You are an expert legal research assistant. Answer the user's question comprehensively using the provided context.

IMPORTANT CITATION REQUIREMENTS:
- When referencing information from sources, use inline citations in the format [CITATION_ID]
- For each citation, identify the specific paragraph or section that supports your point
- Citations should be numbered sequentially starting from 1
- After your answer, provide a citations section listing each citation with:
  - Citation number
  - Source type (document/vault/web/playbook)
  - Source title/name
  - Relevant excerpt/snippet (the specific paragraph that supports the point)
  - For web sources: include the URL
  - For vault sources: include file/clause ID if available

Format your response as:
[Your answer with inline citations like [1], [2], etc.]

=== CITATIONS ===
[1] [type: document] [title: ...] [snippet: ...]
[2] [type: web] [title: ...] [url: ...] [snippet: ...]
...

Be thorough and cite all sources that inform your answer.`;

    const model = 'o3-mini';
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...(request.conversationHistory?.map((msg: AskMessage) => ({
        role: msg.role,
        content: msg.content,
      })) || []),
      {
        role: 'user',
        content: `Context:\n${fullContext}\n\nQuestion: ${request.question}`,
      },
    ];

    logger.info(
      { model, messages },
      'Ask - Generate Answer: Full prompt'
    );

    let accumulatedText = '';
    let citationsSection = '';

    // Stream the LLM response
    for await (const chunk of llmService.generateStream({
      model: {
        provider: 'azure',
        model: 'o3-mini',
        deployment: 'o3-mini',
      },
      messages,
      temperature: 0.3,
      maxTokens: 4000,
    })) {
      if (chunk.done) {
        break;
      }

      accumulatedText += chunk.content;
      
      // Emit content chunks
      yield {
        type: 'content',
        text: chunk.content,
        done: false,
      };
    }

    logger.info(
      { rawResponse: accumulatedText },
      'Ask - Generate Answer: Full LLM response'
    );

    // Skip citation parsing for simple queries
    if (!isSimple) {
      // Parse citations from the response
      // Try to extract citations section
      const citationsMatch = accumulatedText.match(/=== CITATIONS ===\s*([\s\S]*?)(?:\n\n|$)/i);
      if (citationsMatch && citationsMatch[1]) {
        citationsSection = citationsMatch[1];
        accumulatedText = accumulatedText.replace(/=== CITATIONS ===\s*[\s\S]*/i, '').trim();
      }

      // Extract citations - try multiple patterns
      const citationPatterns = [
        // Pattern 1: [1] [type: web] [title: ...] [url: ...] [snippet: ...]
        /\[(\d+)\]\s*\[type:\s*(\w+)\]\s*\[title:\s*([^\]]+)\]\s*(?:\[url:\s*([^\]]+)\])?\s*(?:\[snippet:\s*([^\]]+)\])?/g,
        // Pattern 2: [1] type: web, title: ..., url: ..., snippet: ...
        /\[(\d+)\]\s*type:\s*(\w+),\s*title:\s*([^,]+),\s*(?:url:\s*([^,]+),)?\s*(?:snippet:\s*([^\n]+))?/g,
        // Pattern 3: Simple numbered list with source info
        /(\d+)\.\s*(?:\[(\w+)\]\s*)?([^\n]+)/g,
      ];

      const extractedCitations = new Set<number>();

      for (const pattern of citationPatterns) {
        let match;
        const searchText = citationsSection || accumulatedText;
        while ((match = pattern.exec(searchText)) !== null) {
          const [, id, type, title, url, snippet] = match;
          if (!id) continue;
          const citationId = parseInt(id, 10);
          
          if (extractedCitations.has(citationId)) continue;
          extractedCitations.add(citationId);

          // Find the source in context
          const citation = this.findSourceForCitation(
            (type || 'document') as SourceCitation['type'],
            title || '',
            url,
            context,
            snippet
          );

          if (citation) {
            citation.id = citationId;
            citation.snippet = snippet || citation.snippet || citation.title;
            this.citations.set(citationId, citation);

            yield {
              type: 'citation',
              id: citationId,
              source: citation,
            };
          }
        }
      }

      // Also extract inline citations like [1], [2] from the text and create citations for them
      const inlineCitationPattern = /\[(\d+)\]/g;
      const inlineCitations = new Set<number>();
      let inlineMatch;
      while ((inlineMatch = inlineCitationPattern.exec(accumulatedText)) !== null) {
        if (!inlineMatch[1]) continue;
        const citationId = parseInt(inlineMatch[1], 10);
        if (!extractedCitations.has(citationId) && !inlineCitations.has(citationId)) {
          inlineCitations.add(citationId);
          // Try to find a source that matches - use first available source
          const citation = this.findSourceForCitation('document', '', undefined, context, undefined);
          if (citation) {
            citation.id = citationId;
            this.citations.set(citationId, citation);
            yield {
              type: 'citation',
              id: citationId,
              source: citation,
            };
          }
        }
      }
    }

    // Emit final content chunk
    yield {
      type: 'content',
      text: '',
      done: true,
    };
  }

  /**
   * Find source in context for citation and match to chunk for position data
   */
  private findSourceForCitation(
    type: SourceCitation['type'],
    title: string,
    url: string | undefined,
    context: AskContext,
    snippet?: string // Optional snippet from LLM to match against chunks
  ): SourceCitation | null {
    // If no type specified, try to infer from available sources
    if (!type || type === 'document') {
      if (context.documentContext) {
        // Try to match snippet to a chunk in documentContext
        const chunk = this.matchChunkToText(context.documentContext, snippet);
        return {
          id: ++this.citationCounter,
          type: 'document',
          title: 'Current Document',
          snippet: snippet || context.documentContext.substring(0, 500),
          fullContent: context.documentContext,
          paragraphIndex: chunk?.paragraphIndex,
        };
      }
      // Fall through to try other sources
    }

    switch (type) {
      case 'document':
        if (context.documentContext) {
          const chunk = this.matchChunkToText(context.documentContext, snippet);
          return {
            id: ++this.citationCounter,
            type: 'document',
            title: 'Current Document',
            snippet: snippet || context.documentContext.substring(0, 500),
            fullContent: context.documentContext,
            paragraphIndex: chunk?.paragraphIndex,
          };
        }
        break;

      case 'vault':
        const vaultFile = context.vaultFiles.find(f => 
          title ? f.name.toLowerCase().includes(title.toLowerCase()) : true
        );
        if (vaultFile) {
          // Try to find matching chunk
          const chunks = this.fileChunks.get(vaultFile.id) || [];
          const matchedChunk = snippet
            ? this.findBestMatchingChunk(chunks, snippet)
            : chunks[0];

          const citation: SourceCitation = {
            id: ++this.citationCounter,
            type: 'vault',
            title: vaultFile.name,
            snippet: snippet || matchedChunk?.text || vaultFile.content.substring(0, 500),
            fullContent: vaultFile.content,
            fileId: vaultFile.id,
          };

          // Add position data if chunk found
          if (matchedChunk) {
            citation.paragraphIndex = matchedChunk.paragraphIndex;
            citation.pageNumber = matchedChunk.pageNumber;
            citation.highlightBox = matchedChunk.highlightBox;
            citation.isPDF = !!matchedChunk.pageNumber;
            // Set filePath for viewer (we'll need to get this from storage path)
            if (vaultFile.id) {
              citation.filePath = vaultFile.id; // Use fileId as identifier
            }
          }

          return citation;
        }
        break;

      case 'playbook':
        const playbook = context.vaultPlaybooks.find(p => 
          title ? p.name.toLowerCase().includes(title.toLowerCase()) : true
        );
        if (playbook) {
          return {
            id: ++this.citationCounter,
            type: 'playbook',
            title: playbook.name,
            snippet: snippet || playbook.content.substring(0, 500),
            fullContent: playbook.content,
          };
        }
        break;

      case 'web':
        const webResult = context.webResults.find(r => 
          url ? r.url === url : title ? r.title.toLowerCase().includes(title.toLowerCase()) : true
        );
        if (webResult) {
          return {
            id: ++this.citationCounter,
            type: 'web',
            title: webResult.title,
            snippet: snippet || webResult.snippet,
            fullContent: webResult.content,
            url: webResult.url,
          };
        }
        break;
    }

    // Fallback: return first available source if no match found
    if (context.documentContext) {
      const chunk = this.matchChunkToText(context.documentContext, snippet);
      return {
        id: ++this.citationCounter,
        type: 'document',
        title: 'Current Document',
        snippet: snippet || context.documentContext.substring(0, 500),
        fullContent: context.documentContext,
        paragraphIndex: chunk?.paragraphIndex,
      };
    }
    if (context.vaultFiles.length > 0) {
      const firstFile = context.vaultFiles[0];
      if (firstFile) {
        const chunks = this.fileChunks.get(firstFile.id) || [];
        const matchedChunk = snippet
          ? this.findBestMatchingChunk(chunks, snippet)
          : chunks[0];

        const citation: SourceCitation = {
          id: ++this.citationCounter,
          type: 'vault',
          title: firstFile.name,
          snippet: snippet || matchedChunk?.text || firstFile.content.substring(0, 500),
          fullContent: firstFile.content,
          fileId: firstFile.id,
        };

        if (matchedChunk) {
          citation.paragraphIndex = matchedChunk.paragraphIndex;
          citation.pageNumber = matchedChunk.pageNumber;
          citation.highlightBox = matchedChunk.highlightBox;
          citation.isPDF = !!matchedChunk.pageNumber;
          citation.filePath = firstFile.id;
        }

        return citation;
      }
    }
    if (context.webResults.length > 0) {
      const firstWeb = context.webResults[0];
      if (firstWeb) {
        return {
          id: ++this.citationCounter,
          type: 'web',
          title: firstWeb.title,
          snippet: firstWeb.snippet,
          fullContent: firstWeb.content,
          url: firstWeb.url,
        };
      }
    }

    return null;
  }

  /**
   * Match a snippet to a chunk in document text
   */
  private matchChunkToText(text: string, snippet?: string): { paragraphIndex: number } | null {
    if (!snippet) return null;

    const paragraphs = text.split(/\n\s*\n+/).map((p: string) => p.trim()).filter(Boolean);
    const snippetLower = snippet.toLowerCase().trim();

    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].toLowerCase().includes(snippetLower)) {
        return { paragraphIndex: i + 1 };
      }
    }

    return null;
  }

  /**
   * Find the best matching chunk for a snippet
   */
  private findBestMatchingChunk(chunks: DocumentChunk[], snippet: string): DocumentChunk | null {
    if (!chunks.length || !snippet) return chunks[0] || null;

    const snippetLower = snippet.toLowerCase().trim();
    let bestMatch: DocumentChunk | null = null;
    let bestScore = 0;

    for (const chunk of chunks) {
      const chunkLower = chunk.text.toLowerCase();
      // Simple scoring: count matching words
      const snippetWords = snippetLower.split(/\W+/).filter((w: string) => w.length > 2);
      const score = snippetWords.reduce(
        (acc: number, word: string) => acc + (chunkLower.includes(word) ? 1 : 0),
        0
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = chunk;
      }
    }

    return bestMatch || chunks[0] || null;
  }

  /**
   * Generate follow-up questions
   */
  private async generateFollowUpQuestions(
    question: string,
    context: AskContext
  ): Promise<string[]> {
    const systemPrompt = `You are an expert legal research assistant. Based on the user's question and the context provided, generate 3-5 relevant follow-up questions that would help them explore the topic further.

The questions should:
- Be specific and actionable
- Build on the original question
- Help the user dive deeper into relevant areas
- Be concise (one sentence each)

Return ONLY a JSON array of question strings:
["Question 1", "Question 2", "Question 3"]`;

    const model = 'gpt-4o-mini';
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `Original question: ${question}\n\nGenerate relevant follow-up questions.`,
      },
    ];

    logger.info(
      { model, messages },
      'Ask - Generate Follow-up Questions: Full prompt'
    );

    try {
      const response = await llmService.generate({
        model: {
          provider: 'azure',
          model: 'gpt-4o-mini',
          deployment: 'gpt-4o-mini',
        },
        messages,
        temperature: 0.7,
      });

      logger.info(
        { rawResponse: response.content },
        'Ask - Generate Follow-up Questions: Full LLM response'
      );

      const parsed = this.parseJsonResponse(response.content);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      // Fallback to predefined questions if LLM fails
      if (questions.length === 0) {
        return [
          'Can you provide more details about this?',
          'What are the key considerations I should be aware of?',
          'Are there any related regulations or standards?',
        ];
      }

      return questions.slice(0, 5);
    } catch (error) {
      logger.error({ error }, 'Failed to generate follow-up questions');
      // Return predefined fallback questions
      return [
        'Can you provide more details about this?',
        'What are the key considerations I should be aware of?',
        'Are there any related regulations or standards?',
      ];
    }
  }

  /**
   * Parse JSON from LLM response
   */
  private parseJsonResponse(content: string): any {
    try {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = codeBlockMatch ? codeBlockMatch[1] : content;

      const jsonMatch = jsonString?.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        return JSON.parse(jsonMatch[0]);
      }

      if (jsonString) {
        return JSON.parse(jsonString);
      }
    } catch (error) {
      logger.error({ error, content: content.slice(0, 500) }, 'Failed to parse JSON');
      return {};
    }
  }
}

export const askService = new AskService();

