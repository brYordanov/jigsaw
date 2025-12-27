import { datetime } from 'zod/v4/core/regexes.cjs'
import { TasksJobsService } from '../taks-jobs/tasks-jobs.service'
import { TaskService } from '../tasks/task.service'
import { RunnerService } from './runner.service'

export class TaskSchedulerService {
    private isTickRunning = false
    private intervalId: NodeJS.Timeout | null = null
    constructor(
        private readonly taskService: TaskService,
        private readonly tasksJobsService: TasksJobsService,
        private readonly runnerService: RunnerService
    ) {}

    async tick() {
        if (this.isTickRunning) return
        this.isTickRunning = true

        try {
            const now = new Date()
            const dueTasks = await this.taskService.getDueTasks(now)
            for (const task of dueTasks) {
                try {
                    await this.runnerService.runTask(task)
                } catch (err) {
                    console.error('Error running task', task.id, err)
                }
            }
        } finally {
            this.isTickRunning = false
        }
    }

    startCron() {
        if (this.intervalId) return
        this.intervalId = setInterval(() => {
            this.tick().catch(err => console.error('Cron tick error', err))
        }, 5_000)

        this.intervalId.unref()
    }

    stopCron() {
        if (!this.intervalId) return
        clearInterval(this.intervalId)
        this.intervalId = null
    }
}
