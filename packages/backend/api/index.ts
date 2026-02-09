import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'

export const config = {
  runtime: 'edge',
}

const app = new Hono()

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Root
app.get('/', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    note: 'This is a lightweight proxy. For full API, use Railway deployment.',
  })
})

app.get('/api', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
  })
})

// Catch all
app.all('*', (c) => {
  return c.json({
    message: 'ThinkDoc API',
    path: c.req.path,
    method: c.req.method,
    note: 'Full API routes available on Railway deployment',
  })
})

export default handle(app)
