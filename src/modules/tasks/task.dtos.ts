import z from 'zod'
import { futureDate, isoDate, qAny, qBool } from '../../commonSchemas'

const schedule_type = z.enum(['fixed', 'deadman'])
const interval_type = z.enum(['monthly', 'weekly', 'daily', 'hourly'])
const daysOfWeek = z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
])

export const sortOptionsSchema = z
    .enum(['created_at', 'updated_at', 'name', 'next_run_at', 'last_run_at'])
    .default('created_at')
export type sortOptionsType = z.infer<typeof sortOptionsSchema>

const baseSchema = z.object({
    name: z.string().min(3),
    description: z.string().max(200).nullable().optional(),
    is_single_time_only: z.boolean().default(true),
    is_enabled: z.boolean().default(true),
    days_of_month: z.array(z.number().int().min(0).max(31)).nullable().optional(),
    days_of_week: daysOfWeek.nullable().optional(),
    hours: z.array(z.number().int().min(0).max(23)).nullable().optional(),
    minutes: z.array(z.number().int().min(0).max(59)).nullable().optional(),
    timeout_seconds: z.number().int().positive().nullable().optional(),
    expires_at: futureDate.nullable().optional(),
    jobs_ids: z.array(z.string()),
})

export const createTaskSchema = z.discriminatedUnion('schedule_type', [
    baseSchema.extend({
        schedule_type: z.literal('fixed'),
        interval_type,
        last_ping_at: z.never().optional().nullable(),
    }),
    baseSchema.extend({
        schedule_type: z.literal('deadman'),
        interval_type,
        last_ping_at: isoDate.nullable().optional(),
        timeout_seconds: z.number().int().positive(),
    }),
])
export type CreateTaskBodyDto = z.infer<typeof createTaskSchema>
export type CreateTaskDto = Omit<CreateTaskBodyDto, 'jobs_ids'>

export const updateTaskSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    is_single_time_only: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    schedule_type: schedule_type.optional(),
    interval_type: interval_type.optional(),
    days_of_month: z.array(z.number().int().min(0).max(31)).nullable().optional(),
    days_of_week: daysOfWeek.nullable().optional(),
    hours: z.array(z.number().int().min(0).max(23)).nullable().optional(),
    minutes: z.array(z.number().int().min(0).max(59)).nullable().optional(),
    timeout_seconds: z.number().int().positive().nullable().optional(),
    last_ping_at: isoDate.nullable().optional(),
    expires_at: isoDate.nullable().optional(),
    jobs_ids: z.array(z.string()),
})
export type UpdateTaskBodyDto = z.infer<typeof updateTaskSchema>

export const listTasksQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(4),
    offset: z.coerce.number().int().min(0).default(0),
    schedule_type: qAny(schedule_type),
    interval_type: qAny(interval_type),
    is_enabled: qBool,
    search: z.string().max(200).optional(),
    sort: sortOptionsSchema,
    dir: z.enum(['ASC', 'DESC']).default('DESC'),
})
export type ListTasksQueryDto = z.infer<typeof listTasksQuerySchema>
