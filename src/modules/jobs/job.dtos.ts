import z from 'zod'
import { emailSchema, qAny, qBool, urlSchema } from '../../commonSchemas'

const JobTypeEnum = z.enum(['http', 'email', 'shell', 'healthcheck'])
export type JobType = z.infer<typeof JobTypeEnum>

const HttpConfigSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    url: urlSchema,
    headers: z.record(z.string(), z.string()).default({}),
    body: z.any().optional(),
})
export type HttpConfigDto = z.infer<typeof HttpConfigSchema>

const EmailConfigSchema = z.object({
    to: emailSchema,
    subject: z.string(),
    template: z.string(),
    variables: z.record(z.string(), z.unknown()).default({}),
})
export type EmailConfigDto = z.infer<typeof EmailConfigSchema>

const ShellConfigSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    env: z.record(z.string(), z.unknown()).default({}),
})
export type ShellConfigDto = z.infer<typeof ShellConfigSchema>

const HealthcheckConfigSchema = z.object({
    checks: z.array(
        z.union([
            z.object({
                type: z.literal('http'),
                url: urlSchema,
                expect: z.string().default('2xx'),
            }),
            z.object({ type: z.literal('sql'), statement: z.string() }),
        ])
    ),
    failThreshold: z.number().int().positive().default(2),
    onFail: z.union([
        z.object({ type: z.literal('email'), to: emailSchema, template: z.string() }),
        z.object({
            type: z.literal('http'),
            url: urlSchema,
            method: z.enum(['POST', 'GET']).default('POST'),
        }),
    ]),
})
export type HealthcheckConfigDto = z.infer<typeof HealthcheckConfigSchema>

export const validatorsByType = {
    http: HttpConfigSchema,
    email: EmailConfigSchema,
    shell: ShellConfigSchema,
    healthcheck: HealthcheckConfigSchema,
} as const

export const validateJobConfig = (job_type: string, config: unknown) => {
    const validator = (validatorsByType as Record<string, z.ZodTypeAny>)[job_type]
    if (!validator) throw new Error(`Unknown job_type: ${job_type}`)
    return validator.parse(config)
}

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

export const updateJobBodySchema = z
    .object({
        job_type: JobTypeEnum.optional(),
        config: z.unknown().optional(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        is_enabled: z.boolean().optional(),
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

export const sortOptionsSchema = z.enum(['created_at', 'updated_at', 'name']).default('created_at')
export type sortOptionsType = z.infer<typeof sortOptionsSchema>

export const listJobsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(4),
    offset: z.coerce.number().int().min(0).default(0),
    sort: sortOptionsSchema,
    dir: z.enum(['ASC', 'DESC']).default('DESC'),
    search: z.string().max(200).optional(),
    job_type: qAny(JobTypeEnum),
    is_enabled: qBool,
})
export type ListJobsQueryDto = z.infer<typeof listJobsQuerySchema>
