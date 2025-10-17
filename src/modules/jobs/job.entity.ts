import { JobType } from './job.dtos'

export interface JobRow {
    id: string
    name: string
    description: string | null
    job_type: JobType
    config: Record<string, unknown>
    is_enabled: boolean
    max_retries: number
    retry_backoff_seconds: number
    max_concurrency: number
    created_at: string
    updated_at: string
}

export const RETURN_COLS_DEFAULT =
    `id, name, description, config, job_type, is_enabled, max_retries, retry_backoff_seconds, max_concurrency, created_at, updated_at` as const

export const TABLE_NAME_DEFAULT = 'jobs' as const
