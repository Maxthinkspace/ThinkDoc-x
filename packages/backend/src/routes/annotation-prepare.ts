import { Hono } from 'hono';
import { annotationPrepareController } from '@/controllers/annotation-prepare';

const app = new Hono();

app.post('/prepare', annotationPrepareController.prepareAnnotations);

export const annotationPrepareRoutes = app;