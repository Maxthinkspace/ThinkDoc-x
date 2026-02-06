import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3003),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('https://localhost:3000'),
  ALLOWED_ORIGINS: z.string().transform((str) => str.split(',')).default(['https://localhost:3000']),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Monitoring
  METRICS_PORT: z.string().transform(Number).default(9464),
  HEALTH_CHECK_PATH: z.string().default('/health'),

  // Stripe Payment
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PAYMENT_LINK: z.string().min(1),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional().default('ThinkDoc <noreply@thinkdoc.app>'),
  APP_URL: z.string().url().default('https://thinkdoc.app'),

  // Optional
  REDIS_URL: z.string().optional(),
  
  // Tavily Web Search
  TAVILY_API_KEY: z.string().optional(),
})

export type Environment = z.infer<typeof envSchema>

let env: Environment

try {
  env = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', error.flatten().fieldErrors)
  } else {
    console.error('❌ Invalid environment variables:', error)
  }
  process.exit(1)
}

export { env }
