export type TaskJobRow = {
    id: number
    task_id: number
    job_id: number
    position: number
    is_enabled: boolean
    created_at: string
    updated_at: string
}

export const RETURN_COLS_DEFAULT = `id, task_id, job_id, position, created_at, updated_at` as const

export const TABLE_NAME_DEFAULT = 'tasks_jobs' as const
