import crypto from 'crypto'
import { runHttpJob } from './runners/http.runner'
import { runWithRetries } from './runWithRetries'
import { RunRegistry } from './runRegistry.service'
import { ConcurrencyGate } from './concurrencyGate.service'
import { runEmailJob } from './runners/email.runner'
import { RunAttemptLog, RunnerMap } from './types'
import { runShellJob } from './runners/shell.runner'
import { JobService } from '../jobs/job.service'
import { JobConfig, validateJobConfig } from '../jobs/dtos/module.dtos'
import { JobRunService } from '../job-runs/job-runs.service'
import { TaskService } from '../tasks/task.service'
import { TaskRow } from '../tasks/task.entity'
import { calculateNextRunAt } from '../tasks/intervalHelpers'
import { getEmailTemplate } from '../email/getEmailTemplate'

export class RunnerService {
    private readonly deadmanTimers = new Map<string, NodeJS.Timeout>()
    constructor(
        private readonly jobService: JobService,
        private readonly runRegistry: RunRegistry,
        private readonly concurrencyGate: ConcurrencyGate,
        private readonly logService: JobRunService,
        private readonly taskService: TaskService
    ) {}

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
                    id,
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
                        return this.runWithLoggingAttempt(
                            validatedConfig,
                            onAttempt =>
                                runWithRetries({
                                    totalAttempts: max_retries + 1,
                                    baseBackoffSeconds: retry_backoff_seconds,
                                    perRunTimeoutMs: timeout_seconds * 1000,
                                    runOnce: signal => runner(validatedConfig as any, signal),
                                    outerSignal: controller.signal,
                                    onAttempt,
                                }),
                            job.id
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

    async runTask(task: TaskRow) {
        if (task.schedule_type === 'deadman') {
            await this.sendDeadmanTaskPingEmail(task)
        } else {
            await this.runTaskNormally(task)
        }
    }

    async executeJobById(id: string, taskId?: string): Promise<any> {
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
        if (!runner) {
            return {
                ok: false,
                attempts: 0,
                lastStatus: 'failed',
                lastError: `No runner for type ${job_type}`,
            }
        }

        const validatedConfig = validateJobConfig(job_type, config)
        const { runId } = this.runRegistry.create(id)

        try {
            const outcome = await this.concurrencyGate.run(id, max_concurrency, async () =>
                this.runWithLoggingAttempt(
                    validatedConfig,
                    onAttempt =>
                        runWithRetries({
                            totalAttempts: max_retries + 1,
                            baseBackoffSeconds: retry_backoff_seconds,
                            perRunTimeoutMs: timeout_seconds * 1000,
                            runOnce: signal => runner(validatedConfig as any, signal),
                            onAttempt,
                        }),
                    job.id,
                    taskId
                )
            )

            this.runRegistry.finish(runId, outcome)
            return outcome
        } catch (e: any) {
            const msg = String(e?.message ?? e)
            this.runRegistry.finish(runId, {
                ok: false,
                attempts: 0,
                lastStatus: 'failed',
                lastError: msg,
            })
        }
    }

    cancelDeadmanTimer(taskId: string) {
        const handle = this.deadmanTimers.get(taskId)
        if (handle) {
            clearTimeout(handle)
            this.deadmanTimers.delete(taskId)
        }
    }

    async restoreDeadmanTimers() {
        const tasks = await this.taskService.getActiveDeadmanTasks()
        const now = Date.now()

        for (const task of tasks) {
            if (!task.timeout_seconds || !task.last_ping_at) continue

            const lastPing = new Date(task.last_ping_at)
            const expiresAt = new Date(lastPing.getTime() + task.timeout_seconds * 1000)
            const remainingMs = expiresAt.getTime() - now

            if (remainingMs <= 0) {
                await this.executeDeadmanTimeout(task.id)
            } else {
                this.armDeadmanTimer(task.id, expiresAt)
            }
        }
    }

    private async runTaskNormally(task: TaskRow) {
        await this.runTaskJobs(task)
        await this.takeCareOfTaskDatesOnRun(task)
    }

    private async takeCareOfTaskDatesOnRun(task: TaskRow) {
        const now = new Date()
        if (task.is_single_time_only) {
            await this.taskService.updateTask(task.id, {
                last_run_at: now,
                next_run_at: null,
                is_enabled: false,
                deadman_token: null,
            })
        } else {
            const nextRunAt = calculateNextRunAt(now, {
                interval_type: task.interval_type,
                days_of_month: task.days_of_month,
                days_of_week: task.days_of_week,
                hours: task.hours,
                minutes: task.minutes,
            })

            await this.taskService.updateTask(task.id, {
                last_run_at: now,
                next_run_at: nextRunAt,
                deadman_token: null,
            })
        }
    }

    private async sendDeadmanTaskPingEmail(task: TaskRow) {
        if (!task.timeout_seconds || task.timeout_seconds <= 0) {
            throw new Error('Deadman task requires timeout_seconds > 0')
        }

        const base = process.env.APP_BASE_URL
        if (!base) throw new Error('APP_BASE_URL is not set')

        const now = new Date()
        const timeoutSeconds = task.timeout_seconds
        const token = crypto.randomUUID()
        const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000)
        const emailTemplate = await getEmailTemplate('deadmanTrigger.email')
        const config = {
            to: 'branimiryordanov75@gmail.com',
            subject: `${task.name} Deadman Task Activation`,
            template: emailTemplate,
            variables: {
                taskName: task.name,
                taskId: task.id,
                cancelUrl: `${base}/task/${task.id}/ping/${token}`,
                timeout: task.timeout_seconds,
            },
        }

        await this.runWithLoggingAttempt(config, () => runEmailJob(config), undefined, task.id)
        await this.taskService.updateTask(task.id, { last_ping_at: now, deadman_token: token })
        this.armDeadmanTimer(task.id, expiresAt)
    }

    private armDeadmanTimer(taskId: string, expiresAt: Date) {
        const existing = this.deadmanTimers.get(taskId)
        if (existing) {
            clearTimeout(existing)
        }

        const delayMs = Math.max(0, expiresAt.getTime() - Date.now())
        if (delayMs === 0) {
            setImmediate(() => this.executeDeadmanTimeout(taskId))
            return
        }

        const handle = setTimeout(() => {
            this.deadmanTimers.delete(taskId)
            this.executeDeadmanTimeout(taskId).catch(err => {
                console.error('Error executing deadman task', taskId, err)
            })
        }, delayMs)

        this.deadmanTimers.set(taskId, handle)
    }

    private async executeDeadmanTimeout(taskId: string) {
        const task = await this.taskService.getByIdOrFail(taskId)
        if (!task.is_enabled) return

        await this.runTaskNormally(task)
    }

    private async runTaskJobs(task: TaskRow) {
        const { jobs } = await this.taskService.getTaskWithJobs(task.id)
        if (!jobs || jobs.length === 0) {
            console.log('⚠️ Task has no jobs')
            return
        }

        for (const tj of jobs) {
            const outcome = await this.executeJobById(tj.id, task.id)
            if (outcome?.lastStatus !== 'ok') {
                console.log('❌ Job error while running Task')
                break
            }
        }
    }

    private async runWithLoggingAttempt<T>(
        config_snapshot: JobConfig,
        run: (logAttempt: (log: RunAttemptLog) => Promise<void>) => Promise<T>,
        job_id?: string,
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
}
