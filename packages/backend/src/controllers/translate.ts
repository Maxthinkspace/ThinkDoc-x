import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { llmService } from '@/services/llm';
import type { TranslateExportPdfRequest, TranslateRequest } from '@/schemas/translate';
import { generateTextPdf } from '@/services/text-pdf-service';

function getUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    // DEV MODE: RETURN MOCK USER ID
    return 'dev-user-1';
  }
  return userId as string;
}

const languageNames: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  ko: 'Korean',
  ar: 'Arabic',
};

const translate = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as TranslateRequest;

    if (!body.text || !body.sourceLanguage || !body.targetLanguage) {
      return c.json(
        { success: false, error: 'Text, sourceLanguage, and targetLanguage are required' },
        400
      );
    }

    if (body.sourceLanguage === body.targetLanguage) {
      return c.json(
        { success: false, error: 'Source and target languages must be different' },
        400
      );
    }

    const sourceLangName = languageNames[body.sourceLanguage] || body.sourceLanguage;
    const targetLangName = languageNames[body.targetLanguage] || body.targetLanguage;

    logger.info(
      { userId, sourceLanguage: body.sourceLanguage, targetLanguage: body.targetLanguage, textLength: body.text.length },
      'Translate: Starting translation'
    );

    // Use LLM service to translate
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
Only return the translated text, without any explanations or additional text.

Text to translate:
${body.text}`;

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

    const translatedText = response.content.trim();

    logger.info(
      { userId, sourceLanguage: body.sourceLanguage, targetLanguage: body.targetLanguage },
      'Translate: Translation completed'
    );

    return c.json({
      success: true,
      translatedText,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
    });
  } catch (error) {
    logger.error({ error }, 'Translate: Failed to translate');
    return c.json(
      { success: false, error: 'Failed to translate text' },
      500
    );
  }
};

export const translateController = {
  translate,
  async exportPdf(c: Context) {
    try {
      const userId = getUserId(c);
      const body = await c.req.json() as TranslateExportPdfRequest;

      logger.info({ userId, textLength: body.text.length }, 'Translate: Export PDF started');

      const pdfBuffer = await generateTextPdf({
        title: 'Translated Text',
        text: body.text,
      });
      const pdfBytes = new Uint8Array(pdfBuffer)

      const safeFileName = (body.fileName || 'translated.pdf')
        .replace(/[^\w.\-()\s]/g, '')
        .trim() || 'translated.pdf';

      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFileName}"`,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Translate: Export PDF failed');
      return c.json({ success: false, error: 'Failed to export PDF' }, 500);
    }
  },
};

