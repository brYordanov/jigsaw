import { Pool, PoolClient } from 'pg'
import { TasksJobsRepository } from './tasks-jobs.repo'

export class TasksJobsService {
    constructor(private readonly repo = new TasksJobsRepository()) {}

    async assignJobsToTask(taskId: number, jobIds: string[], client?: PoolClient): Promise<void> {
        return this.repo.replaceForTaskTx(taskId, jobIds, client)
    }
}
