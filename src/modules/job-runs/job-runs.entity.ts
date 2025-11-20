import { JobConfig } from '../jobs/dtos/module.dtos'

export interface JobRun {
    id: string
    job_id: string
    status: 'ok' | 'failed'
    created_at: string
    task_id?: string
    error_message?: string
    config_snapshot?: JobConfig
}

export const RETURN_COLS_DEFAULT = `id, job_id, task_id, status, error_message, config_snapshot, created_at`

export const TABLE_NAME_DEFAULT = 'job_runs' as const
