import z from 'zod'
import { JobTypeSchema, validatorsByType } from './module.dtos'

export const updateJobBodySchema = z
    .object({
        job_type: JobTypeSchema.optional(),
        config: z.unknown().optional(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        is_enabled: z.boolean().optional().default(false),
        max_retries: z.number().int().min(0).optional(),
        retry_backoff_seconds: z.number().int().min(0).optional(),
        max_concurrency: z.number().int().min(1).optional(),
        timeout_seconds: z.number().int().positive().nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.config === undefined) return

        if (!data.job_type) {
            ctx.addIssue({
                code: 'custom',
                path: ['job_type'],
                message: 'job_type is required when updating config',
            })
            return
        }

        const schema = validatorsByType[data.job_type]
        const parsed = schema.safeParse(data.config)
        if (!parsed.success) {
            parsed.error.issues.forEach(issue =>
                ctx.addIssue({ ...issue, path: ['config', ...(issue.path ?? [])] })
            )
        }
    })
export type UpdateJobBodyDto = z.infer<typeof updateJobBodySchema>
