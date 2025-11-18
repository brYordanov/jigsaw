import z from 'zod'
import { emailSchema } from '../../../commonSchemas'

export const EmailConfigSchema = z.object({
    to: emailSchema,
    subject: z.string(),
    template: z.string(),
    variables: z.record(z.string(), z.unknown()).default({}),
})
export type EmailConfigDto = z.infer<typeof EmailConfigSchema>
