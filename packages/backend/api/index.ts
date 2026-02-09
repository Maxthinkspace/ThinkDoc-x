import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'

// Export config for Vercel Edge Runtime
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
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    message: 'API is working!',
  })
})

app.get('/api', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

// Catch all
app.all('*', (c) => {
  return c.json({
    message: 'ThinkDoc API endpoint',
    path: c.req.path,
    method: c.req.method,
  })
})

export default handle(app)
