import z from 'zod'
import { emailSchema, qAny, qBool, urlSchema } from '../../../commonSchemas'
import { HealthcheckConfigDto, HealthcheckConfigSchema } from './healthcheck-config.dto'
import { HttpConfigDto, HttpConfigSchema } from './http-config.dto'
import { ShellConfigDto, ShellConfigSchema } from './shell-config.dto'
import { EmailConfigDto, EmailConfigSchema } from './email-config.dto'

export const JobTypeEnum = z.enum(['http', 'email', 'shell', 'healthcheck'])
export type JobType = z.infer<typeof JobTypeEnum>

export const validatorsByType = {
    http: HttpConfigSchema,
    email: EmailConfigSchema,
    shell: ShellConfigSchema,
    healthcheck: HealthcheckConfigSchema,
} as const

export const validateJobConfig = (job_type: string, config: unknown) => {
    const parsedType = JobTypeEnum.parse(job_type)
    const validator = validatorsByType[parsedType]
    return validator.parse(config)
}

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

export const JobConfigSchema = z.discriminatedUnion('type', [
    HttpConfigSchema,
    HealthcheckConfigSchema,
    EmailConfigSchema,
    ShellConfigSchema,
])
export type JobConfig = z.infer<typeof JobConfigSchema>
