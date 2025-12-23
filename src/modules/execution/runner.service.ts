import { runHttpJob } from './runners/http.runner'
import { runWithRetries } from './runWithRetries'
import { RunRegistry } from './runRegistry.service'
import { ConcurrencyGate } from './concurrencyGate.service'
import { runEmailJob } from './runners/email.runner'
import { RunAttemptLog, RunnerMap } from './types'
import { runShellJob } from './runners/shell.runner'
import { runHealthcheckJob } from './runners/healthcheck.runner'
import { JobService } from '../jobs/job.service'
import { JobConfig, validateJobConfig } from '../jobs/dtos/module.dtos'
import { JobRunService } from '../job-runs/job-runs.service'

export class RunnerService {
    constructor(
        private readonly jobService: JobService,
        private readonly runRegistry: RunRegistry,
        private readonly concurrencyGate: ConcurrencyGate,
        private readonly logService: JobRunService
    ) {}

    //todo add concurrency
    async executeJobById(id: string): Promise<any> {
        const job = await this.jobService.getByIdOrFail(id)
        const {
            is_enabled,
            job_type,
            config,
            max_retries,
            retry_backoff_seconds,
            max_concurrency,
            timeout_seconds,
        } = job

        if (!is_enabled)
            return { ok: false, attempts: 0, lastStatus: 'failed', lastError: 'Job not enabled' }

        const runner = getRunner[job_type as keyof typeof getRunner]
        if (!runner)
            return {
                ok: false,
                attempts: 0,
                lastStatus: 'failed',
                lastError: `No runner for type ${job_type}`,
            }

        const validatedConfig = validateJobConfig(job_type, config)

        return this.concurrencyGate.run(id, max_concurrency, () =>
            runWithRetries({
                totalAttempts: max_retries + 1,
                baseBackoffSeconds: retry_backoff_seconds,
                perRunTimeoutMs: timeout_seconds * 1000,
                runOnce: () => runner(validatedConfig as any),
            })
        )
    }

    async startJobById(id: string) {
        const job = await this.jobService.getByIdOrFail(id)
        const {
            is_enabled,
            job_type,
            config,
            max_retries,
            retry_backoff_seconds,
            timeout_seconds,
            max_concurrency,
        } = job

        if (!is_enabled) throw new Error('Job not enabled')

        const runner = getRunner[job_type as keyof typeof getRunner]
        if (!runner) throw new Error(`No runner for type ${job_type}`)

        const validatedConfig = validateJobConfig(job_type, config)

        const { runId, controller } = this.runRegistry.create(id)

        ;(async () => {
            try {
                const outcome = await this.concurrencyGate.run(
                    String(id),
                    max_concurrency,
                    async () => {
                        if (controller.signal.aborted) {
                            return {
                                ok: false,
                                attempts: 0,
                                lastStatus: 'failed',
                                lastError: 'aborted',
                            }
                        }
                        return this.runWithLoggingAttempt(job.id, validatedConfig, onAttempt =>
                            runWithRetries({
                                totalAttempts: max_retries + 1,
                                baseBackoffSeconds: retry_backoff_seconds,
                                perRunTimeoutMs: timeout_seconds * 1000,
                                runOnce: signal => runner(validatedConfig as any, signal),
                                outerSignal: controller.signal,
                                onAttempt,
                            })
                        )
                    },
                    controller.signal
                )

                this.runRegistry.finish(runId, outcome)
            } catch (e: any) {
                const msg = String(e?.message ?? e)
                this.runRegistry.finish(runId, {
                    ok: false,
                    attempts: 0,
                    lastStatus: 'failed',
                    lastError: msg,
                })
            }
        })()

        return { runId }
    }

    cancelRun(runId: string) {
        return this.runRegistry.cancel(runId)
    }

    subscribe(runId: string, fn: (e: any) => void) {
        return this.runRegistry.subscribe(runId, fn)
    }

    getRun(runId: string) {
        return this.runRegistry.get(runId)
    }

    async runWithLoggingAttempt<T>(
        job_id: string,
        config_snapshot: JobConfig,
        run: (logAttempt: (log: RunAttemptLog) => Promise<void>) => Promise<T>,
        task_id?: string
    ) {
        const logAttempt = async ({ status, error, result, aborted, attempt }: RunAttemptLog) => {
            const finalStatus = aborted ? 'aborted' : status
            await this.logService.create({
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
}

const getRunner: RunnerMap = {
    http: runHttpJob,
    email: runEmailJob,
    shell: runShellJob,
    healthcheck: runHealthcheckJob,
}
