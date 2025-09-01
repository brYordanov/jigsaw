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

    days: number[] | null
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
