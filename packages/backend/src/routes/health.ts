import { Hono } from 'hono'
import { healthController } from '@/controllers/health'

const health = new Hono()

health.get('/', healthController.check)
health.get('/health', healthController.check)
health.get('/ready', healthController.readiness)
health.get('/live', healthController.liveness)

export { health }