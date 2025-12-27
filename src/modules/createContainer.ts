import { ConcurrencyGate } from './execution/concurrencyGate.service'
import { RunnerService } from './execution/runner.service'
import { RunRegistry } from './execution/runRegistry.service'
import { JobRunService } from './job-runs/job-runs.service'
import { JobRunRepository } from './job-runs/job-runs.repo'
import { JobRepository } from './jobs/job.repo'
import { JobService } from './jobs/job.service'
import { TasksJobsRepository } from './taks-jobs/tasks-jobs.repo'
import { TasksJobsService } from './taks-jobs/tasks-jobs.service'
import { TaskRepository } from './tasks/task.repo'
import { TaskService } from './tasks/task.service'
import { TaskSchedulerService } from './execution/scheduler.service'

export type Container = ReturnType<typeof createContainer>

export function createContainer() {
    const jobRepo = new JobRepository()
    const jobService = new JobService(jobRepo)
    const jobRunRepo = new JobRunRepository()
    const jobRunService = new JobRunService(jobRunRepo)
    const tasksJobsRepo = new TasksJobsRepository()
    const tasksJobsService = new TasksJobsService(tasksJobsRepo)
    const taskRepo = new TaskRepository()
    const taskService = new TaskService(taskRepo, jobRepo, tasksJobsService)
    const runRegistry = new RunRegistry()
    const concurrencyGate = new ConcurrencyGate()
    const runnerService = new RunnerService(
        jobService,
        runRegistry,
        concurrencyGate,
        jobRunService,
        taskService
    )
    const taskSchedulerService = new TaskSchedulerService(
        taskService,
        tasksJobsService,
        runnerService
    )

    return {
        jobService,
        jobRepo,
        jobRunService,
        jobRunRepo,
        tasksJobsService,
        tasksJobsRepo,
        taskService,
        taskRepo,
        runnerService,
        taskSchedulerService,
    }
}
