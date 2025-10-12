import { JobRow } from '../jobs/job.entity'
import { TasksJobsRepository } from './tasks-jobs.repo'

export class TasksJobsService {
    constructor(private readonly repo = new TasksJobsRepository()) {}

    async assignJobsToTask(taskId: number, jobIds: number[]): Promise<void> {
        return this.repo.replaceForTaskTx(taskId, jobIds)
    }
}
