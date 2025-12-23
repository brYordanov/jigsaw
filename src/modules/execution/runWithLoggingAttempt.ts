import { JobRunService } from '../job-runs/job-runs.service'
import { JobConfig } from '../jobs/dtos/module.dtos'

type AttemptStatus = 'ok' | 'failed' | 'aborted'
export interface RunAttemptLog {
    attempt: number
    status: AttemptStatus
    result?: Record<string, unknown>
    error?: string
    aborted?: boolean
}
const logService = new JobRunService()
export const runWithLoggingAttempt = async <T>(
    job_id: string,
    config_snapshot: JobConfig,
    run: (logAttempt: (log: RunAttemptLog) => Promise<void>) => Promise<T>,
    task_id?: string
) => {
    const logAttempt = async ({ status, error, result, aborted, attempt }: RunAttemptLog) => {
        const finalStatus = aborted ? 'aborted' : status
        await logService.create({
            job_id,
            status: finalStatus,
            config_snapshot,
            task_id,
            error_message: error,
            result,
            attempts: attempt,
        })
    }

    return run(logAttempt)
}
