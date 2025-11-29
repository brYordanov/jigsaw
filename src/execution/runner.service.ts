import { JobService } from '../modules/jobs/job.service'
import { validateJobConfig } from '../modules/jobs/dtos/module.dtos'
import { runHttpJob } from './runners/http.runner'
import { runWithRetries } from './runWithRetries'
import { RunRegistry } from './runRegistry'
import { ConcurrencyGate } from './concurrencyGate'
import { runEmailJob } from './runners/email.runner'
import { RunnerMap } from './types'
import { runShellJob } from './runners/shell.runner'
import { runHealthcheckJob } from './runners/healthcheck.runner'
import { runWithLoggingAttempt } from './runWithLoggingAttempt'

export class RunnerService {
    constructor(
        private readonly jobService = new JobService(),
        private readonly runRegistry = new RunRegistry(),
        private readonly concurrencyGate = new ConcurrencyGate()
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
                        return runWithLoggingAttempt(job.id, validatedConfig, onAttempt =>
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
}

const getRunner: RunnerMap = {
    http: runHttpJob,
    email: runEmailJob,
    shell: runShellJob,
    healthcheck: runHealthcheckJob,
}
