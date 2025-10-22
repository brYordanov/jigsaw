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
import e from 'express'

export class RunnerService {
    constructor(private readonly jobService = new JobService()) {}

    async executeJobById(id: string): Promise<any> {
        const job = await this.jobService.getByIdOrFail(id)
        const {
            is_enabled,
            job_type,
            config,
            max_retries,
            retry_backoff_seconds,
            max_concurrency,
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

        const totalAttempts = max_retries + 1
        let attempts = 0
        let lastResult: any
        let lastError: string | undefined
        let lastStatus: 'success' | 'failed' = 'failed'

        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
            attempts = attempt
            try {
                const result = await runner(validatedConfig as any)
                lastResult = result
                lastStatus = result.ok ? 'success' : 'failed'

                if (result.ok)
                    return { ok: true, attempts: attempt, lastStatus: 'success', lastResult }
            } catch (err: any) {
                lastError = err?.message ?? err
                lastStatus = 'failed'
            }

            if (attempt < totalAttempts) {
                const waitMs = exponentialBackoffMs(retry_backoff_seconds, attempt)
                await sleep(waitMs)
            }
        }

        return { ok: false, attempts, lastStatus, lastResult, lastError }
    }
}

export type RunnerMap = {
    http: (config: HttpConfigDto) => Promise<any>
    // shell: (config: ShellConfigDto) => Promise<any>
    // sql: (config: SqlConfigDto) => Promise<any>
    // email: (config: EmailConfigDto) => Promise<any>
    // healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}

export const getRunner: RunnerMap = {
    http: runHttpJob,
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const exponentialBackoffMs = (baseSeconds: number, attempt: number) => {
    const baseMs = baseSeconds * 1000
    const exp = Math.max(1, attempt - 1)
    const raw = baseMs * Math.pow(2, exp)
    const jitter = 0.2 + Math.random() * 0.6
    return Math.round(raw * jitter)
}
