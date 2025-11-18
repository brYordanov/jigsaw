import z from 'zod'
import { emailSchema, urlSchema } from '../../../commonSchemas'

const HttpCheckSchema = z.object({
    type: z.literal('http'),
    url: urlSchema,
    expect: z.string().default('2xx'),
})
const DbCheckSchema = z.object({
    type: z.literal('db'),
    target: z.string().min(1),
})
const OnFailEmailSchema = z.object({
    type: z.literal('email'),
    to: emailSchema,
    template: z.string(),
})
const OnFailHttpSchema = z.object({
    type: z.literal('http'),
    url: urlSchema,
    method: z.enum(['POST', 'GET']).default('POST'),
})
export const HealthcheckConfigSchema = z.object({
    checks: z.array(z.discriminatedUnion('type', [HttpCheckSchema, DbCheckSchema])),
    failThreshold: z.number().int().positive().default(2),
    onFail: z.discriminatedUnion('type', [OnFailEmailSchema, OnFailHttpSchema]),
})
export type HealthcheckConfigDto = z.infer<typeof HealthcheckConfigSchema>
