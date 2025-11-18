import z from 'zod'
import { validatorsByType } from '../job.dtos'

const commonJobFields = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    is_enabled: z.boolean().default(true),
    max_retries: z.number().int().min(0).default(3),
    retry_backoff_seconds: z.number().int().min(0).default(60),
    max_concurrency: z.number().int().min(1).default(1),
    timeout_seconds: z.number().int().positive().nullable().optional(),
})

export const createJobBodySchema = z.discriminatedUnion('job_type', [
    z
        .object({ job_type: z.literal('http'), config: validatorsByType.http })
        .extend(commonJobFields.shape),
    z
        .object({ job_type: z.literal('email'), config: validatorsByType.email })
        .extend(commonJobFields.shape),
    z
        .object({ job_type: z.literal('shell'), config: validatorsByType.shell })
        .extend(commonJobFields.shape),
    z
        .object({ job_type: z.literal('healthcheck'), config: validatorsByType.healthcheck })
        .extend(commonJobFields.shape),
])
export type CreateJobBodyDto = z.infer<typeof createJobBodySchema>
