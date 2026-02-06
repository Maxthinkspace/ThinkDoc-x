import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { translateController } from '@/controllers/translate';
import { translateExportPdfRequestSchema, translateRequestSchema } from '@/schemas/translate';
import { authMiddleware } from '@/middleware/auth';

const translateRoutes = new Hono();

// Apply auth middleware
translateRoutes.use(authMiddleware());

// Translate text endpoint
translateRoutes.post(
  '/',
  zValidator('json', translateRequestSchema),
  translateController.translate
);

translateRoutes.post(
  '/export-pdf',
  zValidator('json', translateExportPdfRequestSchema),
  translateController.exportPdf
);

export { translateRoutes };

