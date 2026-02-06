import { Hono } from 'hono';
import type { Context } from 'hono';
import { analyzeDefinitions, healthCheck, generateDefinition, resolveDuplicateDefinitions } from '../controllers/definition-checker';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

/**
 * POST /analyze
 * Analyze document for definition issues
 * Requires authentication
 */
app.post('/analyze', authMiddleware(), async (c: Context) => {
  try {
    console.log('🔵 Definition checker route called');
    
    const body = await c.req.json();
    
    console.log('📥 Request body received:');
    console.log('   - Keys:', Object.keys(body));
    console.log('   - Has structure:', !!body.structure);
    console.log('   - Has documentStructure:', !!body.documentStructure);
    console.log('   - Has recitals:', !!body.recitals);
    console.log('   - Has language:', !!body.language);
    console.log('   - Has definitionSection:', !!body.definitionSection);
    console.log('   - definitionSection value:', body.definitionSection || '(not provided)');
    
    // Validate request body
    if (!body.structure) {
      console.log('❌ Validation failed: missing structure field');
      return c.json({
        error: 'Missing required field: structure',
        received: Object.keys(body),
        hint: 'Expected format: { structure: [...], recitals: "...", language: "english" }'
      }, 400);
    }
    
    console.log('✅ Validation passed');
    
    // Extract language parameter (default to 'english')
    const language = body.language || 'english';
    
    console.log('🚀 Calling analyzeDefinitions...');
    
    // Call the analysis function
    const result = await analyzeDefinitions(body, language);
    
    console.log('✅ Analysis complete');
    
    return c.json(result);
  } catch (error) {
    console.error('❌ Error in definition checker route:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 500);
  }
});

/**
 * POST /generate-definition
 * Generate a definition for an undefined term using LLM
 * Requires authentication
 */
app.post('/generate-definition', authMiddleware(), async (c: Context) => {
  try {
    console.log('🔵 Generate definition route called');

    const body = await c.req.json();

    // Validate required fields
    if (!body.term || !body.occurrences || !body.structure) {
      return c.json({
        error: 'Missing required fields: term, occurrences, structure',
        received: Object.keys(body),
      }, 400);
    }

    const result = await generateDefinition({
      term: body.term,
      occurrences: body.occurrences,
      structure: body.structure,
      recitals: body.recitals,
      definitionSection: body.definitionSection,
    });

    return c.json(result);
  } catch (error) {
    console.error('❌ Error in generate-definition route:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /resolve-duplicates
 * Resolve duplicate definitions for a term using LLM
 * Requires authentication
 */
app.post('/resolve-duplicates', authMiddleware(), async (c: Context) => {
  try {
    console.log('🔵 Resolve duplicates route called');

    const body = await c.req.json();

    if (!body.term || !body.occurrences || !body.structure) {
      return c.json({
        error: 'Missing required fields: term, occurrences, structure',
        received: Object.keys(body),
      }, 400);
    }

    const result = await resolveDuplicateDefinitions({
      term: body.term,
      occurrences: body.occurrences,
      structure: body.structure,
      recitals: body.recitals,
      previousAmendments: body.previousAmendments,
    });

    return c.json(result);
  } catch (error) {
    console.error('❌ Error in resolve-duplicates route:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /health
 * Health check endpoint
 * No authentication required
 */
app.get('/health', (c: Context) => {
  const result = healthCheck();
  return c.json(result);
});

export default app;