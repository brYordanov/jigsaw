import { Pool, PoolClient } from 'pg'
import { TasksJobsRepository } from './tasks-jobs.repo'

export class TasksJobsService {
    constructor(private readonly repo: TasksJobsRepository) {}

    async assignJobsToTask(taskId: string, jobIds: string[], client?: PoolClient): Promise<void> {
        return this.repo.replaceForTaskTx(taskId, jobIds, client)
    }

    async getJobsForTask(taskId: string) {
        return this.repo.get({ where: { task_id: taskId } })
    }
}
