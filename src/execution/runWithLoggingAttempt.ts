type AttemptStatus = 'ok' | 'failed' | 'aborted'
export interface RunAttemptLog {
    attempt: number
    status: AttemptStatus
    result?: Record<string, unknown>
    error?: string
    aborted?: boolean
}

export const runWithLoggingAttempt = () => {}
