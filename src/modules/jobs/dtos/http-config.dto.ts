import z from 'zod'
import { urlSchema } from '../../../commonSchemas'

export const HttpConfigSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    url: urlSchema,
    headers: z.record(z.string(), z.string()).default({}),
    body: z.any().optional(),
})
export type HttpConfigDto = z.infer<typeof HttpConfigSchema>
