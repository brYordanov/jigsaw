import { JobService } from '../modules/jobs/job.service'
import {
    EmailConfigDto,
    HealthcheckConfigDto,
    HttpConfigDto,
    ShellConfigDto,
    SqlConfigDto,
    validateJobConfig,
} from '../modules/jobs/job.dtos'
import { runHttpJob } from './runners/http.runner'
import { runWithRetries } from './runner.helpers'
import { RunRegistry } from './run.registry'

export class RunnerService {
    constructor(
        private readonly jobService = new JobService(),
        private runRegistry = new RunRegistry()
    ) {}

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

        return runWithRetries(max_retries + 1, retry_backoff_seconds, timeout_seconds * 1000, () =>
            runner(validatedConfig as any)
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
        } = job

        if (!is_enabled) throw new Error('Job not enabled')

        const runner = getRunner[job_type as keyof typeof getRunner]
        if (!runner) throw new Error(`No runner for type ${job_type}`)

        const validatedConfig = validateJobConfig(job_type, config)

        const { runId, controller } = this.runRegistry.create(id)

        ;(async () => {
            const outcome = await runWithRetries(
                max_retries + 1,
                retry_backoff_seconds,
                timeout_seconds * 1000,
                signal => runner(validatedConfig as any, signal),
                controller.signal
            )
            this.runRegistry.finish(runId, outcome)
        })().catch(e => this.runRegistry.finish(runId, { ok: false, lastError: String(e) }))

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

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    // shell: (config: ShellConfigDto) => Promise<any>
    // sql: (config: SqlConfigDto) => Promise<any>
    // email: (config: EmailConfigDto) => Promise<any>
    // healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}

export const getRunner: RunnerMap = {
    http: runHttpJob,
}
