import type { Context } from 'hono'
import { db, testDatabaseConnection } from '@/config/database'
import { env } from '@/config/env'
import { llmConfig } from '@/config/llm'

export const healthController = {
  async check(c: Context) {
    const startTime = Date.now()
    const dbHealthy = await testDatabaseConnection()
    const responseTime = Date.now() - startTime
    
    const health: any = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbHealthy ? 'pass' : 'fail',
          responseTime: `${responseTime}ms`,
        },
        memory: {
          status: 'pass',
          usage: process.memoryUsage(),
        },
      },
    }

    // Dev-only: surface whether LLM provider env vars are present (never return secrets).
    if (env.NODE_ENV === 'development') {
      health.checks.llm = {
        status: 'pass',
        providers: {
          openai: {
            hasApiKey: !!llmConfig.OPENAI_API_KEY,
            hasBaseUrl: !!llmConfig.OPENAI_BASE_URL,
          },
          anthropic: {
            hasApiKey: !!llmConfig.ANTHROPIC_API_KEY,
            hasBaseUrl: !!llmConfig.ANTHROPIC_BASE_URL,
          },
          google: {
            hasApiKey: !!llmConfig.GOOGLE_API_KEY,
            hasBaseUrl: !!llmConfig.GOOGLE_BASE_URL,
          },
          openrouter: {
            hasApiKey: !!llmConfig.OPENROUTER_API_KEY,
            hasBaseUrl: !!llmConfig.OPENROUTER_BASE_URL,
          },
          azure: {
            hasApiKey: !!llmConfig.AZURE_OPENAI_API_KEY,
            hasEndpoint: !!llmConfig.AZURE_OPENAI_ENDPOINT,
            hasApiVersion: !!llmConfig.AZURE_OPENAI_API_VERSION,
          },
          ollama: {
            baseUrl: llmConfig.OLLAMA_BASE_URL,
          },
        },
      }
    }
    
    const statusCode = dbHealthy ? 200 : 503
    
    return c.json(health, statusCode)
  },

  async readiness(c: Context) {
    const dbHealthy = await testDatabaseConnection()
    
    if (!dbHealthy) {
      return c.json({ status: 'not_ready', reason: 'Database connection failed' }, 503)
    }
    
    return c.json({ status: 'ready' })
  },

  async liveness(c: Context) {
    return c.json({ status: 'alive', timestamp: new Date().toISOString() })
  },
}