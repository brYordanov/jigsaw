import z from 'zod'
import { qAny } from '../../../commonSchemas'

export const jobRunStatusEnum = z.enum(['ok', 'failed', 'aborted'])

export const sortOptionsSchema = z.enum(['created_at', 'job_id', 'task_id']).default('created_at')

export const listJobRunsQuerySchema = z
    .object({
        limit: z.coerce.number().int().min(1).max(100).default(4),
        offset: z.coerce.number().int().min(0).default(0),
        sort: sortOptionsSchema,
        dir: z.enum(['ASC', 'DESC']).default('DESC'),
        searchJobId: z.string().max(200).optional(),
        searchTaskId: z.string().max(200).optional(),
        after_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
            .optional(),
        before_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
            .optional(),
        status: qAny(jobRunStatusEnum),
    })
    .refine(
        data => {
            if (!data.after_date || !data.before_date) return true
            return data.after_date <= data.before_date
        },
        { message: 'after_date must be <= before_date', path: ['after_date'] }
    )
export type listJobRunsQueryDto = z.infer<typeof listJobRunsQuerySchema>
