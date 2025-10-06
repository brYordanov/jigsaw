import { JobType } from './job.dtos'

export interface JobRow {
    id: number
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
