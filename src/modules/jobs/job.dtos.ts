import z from 'zod'

const urlSchema = z.string().regex(/^https?:\/\/[^\s$.?#].[^\s]*$/i, 'Invalid URL')
const emailSchema = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address')
const JobTypeEnum = z.enum(['http', 'email', 'shell', 'sql', 'healthcheck'])

const HttpConfigSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    url: urlSchema,
    headers: z.record(z.string(), z.string()).default({}),
    body: z.unknown().optional(),
})

const EmailConfigSchema = z.object({
    to: emailSchema,
    subject: z.string(),
    template: z.string(),
    variables: z.record(z.string(), z.unknown()).default({}),
})

const ShellConfigSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    env: z.record(z.string(), z.unknown()).default({}),
    timeoutSeconds: z.number().int().positive().optional(),
})

const SqlConfigSchema = z.object({
    statement: z.string(),
    params: z.array(z.unknown()).default([]),
    assert: z
        .object({
            maxRowCount: z.number().int().positive().optional(),
            minRowCount: z.number().int().min(0).optional(),
        })
        .partial()
        .default({}),
})

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

const validatorsByType = {
    http: HttpConfigSchema,
    email: EmailConfigSchema,
    shell: ShellConfigSchema,
    sql: SqlConfigSchema,
    healthcheck: HealthcheckConfigSchema,
} as const

export function validateJobConfig(job_type: keyof typeof validatorsByType, config: unknown) {
    return validatorsByType[job_type].parse(config)
}

const commonJobFields = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    is_enabled: z.boolean().default(true),
    max_retries: z.number().int().min(0).default(3),
    retry_backoff_seconds: z.number().int().min(0).default(60),
    max_concurrency: z.number().int().min(1).default(1),
})

export const createJobSchema = z.discriminatedUnion('job_type', [
    z
        .object({ job_type: z.literal('http'), config: validatorsByType.http })
        .extend(commonJobFields),
    z
        .object({ job_type: z.literal('email'), config: validatorsByType.email })
        .extend(commonJobFields),
    z
        .object({ job_type: z.literal('shell'), config: validatorsByType.shell })
        .extend(commonJobFields),
    z.object({ job_type: z.literal('sql'), config: validatorsByType.sql }).extend(commonJobFields),
    z
        .object({ job_type: z.literal('healthcheck'), config: validatorsByType.healthcheck })
        .extend(commonJobFields),
])

export type CreateJobDto = z.infer<typeof createJobSchema>

export const editJobSchema = z
    .object({
        job_type: JobTypeEnum.optional(),
        config: z.unknown().optional(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        is_enabled: z.boolean().optional(),
        max_retries: z.number().int().min(0).optional(),
        retry_backoff_seconds: z.number().int().min(0).optional(),
        max_concurrency: z.number().int().min(1).optional(),
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

export type EditJobDto = z.infer<typeof editJobSchema>
