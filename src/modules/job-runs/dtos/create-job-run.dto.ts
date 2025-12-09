import z from 'zod'
import { JobConfigSchema } from '../../jobs/dtos/module.dtos'

export const CreateJobRunSchema = z.object({
    job_id: z.string(),
    status: z.enum(['ok', 'failed', 'aborted']),
    task_id: z.string().optional(),
    error_message: z.string().optional(),
    config_snapshot: JobConfigSchema,
    result: z.record(z.string(), z.unknown()).optional(),
    attempts: z.number(),
})
export type CreateJobRunDto = z.infer<typeof CreateJobRunSchema>
