import { RunnerService } from './execution/runner.service'
import { JobRunService } from './job-runs/job-runs.service'
import { JobRunRepository } from './job-runs/jon-runs.repository'
import { JobRepository } from './jobs/job.repo'
import { JobService } from './jobs/job.service'
import { TasksJobsRepository } from './taks-jobs/tasks-jobs.repo'
import { TasksJobsService } from './taks-jobs/tasks-jobs.service'
import { TaskRepository } from './tasks/task.repo'
import { TaskService } from './tasks/task.service'

export type Container = ReturnType<typeof createContainer>

export function createContainer() {
    const jobService = new JobService()
    const jobRepo = new JobRepository()
    const jobRunService = new JobRunService()
    const jobRunRepo = new JobRunRepository()
    const tasksJobsService = new TasksJobsService()
    const tasksJobsRepo = new TasksJobsRepository()
    const taskService = new TaskService()
    const taskRepo = new TaskRepository()
    const runnerService = new RunnerService()

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
    }
}
