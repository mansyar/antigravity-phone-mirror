import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  WS_PORT: z.coerce.number().default(3334),
  AUTH_PIN: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'PIN must be 6 digits'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  VAPID_EMAIL: z.string().email().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CDP_PORTS: z.string().default('9000,9001,9002,9003'),
})

// Validation helper for server-side code
export const env =
  typeof process !== 'undefined'
    ? envSchema.parse(process.env)
    : ({} as z.infer<typeof envSchema>)
export type Env = z.infer<typeof envSchema>
