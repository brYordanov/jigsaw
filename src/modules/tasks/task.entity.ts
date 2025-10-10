export type ScheduleType = 'fixed' | 'deadman'
export type IntervalType = 'monthly' | 'weekly' | 'daily' | 'hourly'

export interface TaskRow {
    id: number
    name: string
    description: string | null
    is_single_time_only: boolean
    is_enabled: boolean

    schedule_type: ScheduleType
    interval_type: IntervalType

    days_of_month: number[] | null
    days_of_week: number[] | null
    hours: number[] | null
    minutes: number[] | null

    last_run_at: string | null
    next_run_at: string | null
    timeout_seconds: number | null
    last_ping_at: string | null
    expires_at: string | null

    created_at: string
    updated_at: string
}

export const RETURN_COLS_DEFAULT = `id, name, description, is_single_time_only, is_enabled,
  schedule_type, interval_type, days_of_month, days_of_week, hours, minutes, last_run_at, next_run_at, 
  timeout_seconds, last_ping_at, expires_at,
  created_at, updated_at` as const

export const TABLE_NAME_DEFAULT = 'tasks' as const
