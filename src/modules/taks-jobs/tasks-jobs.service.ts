import { TaskRow } from '../tasks/task.entity'
import { TaskJobRow } from './tasks-jobs.entity'

export class TasksJobsService {
    constructor(private readonly repo = ) {}

    async getJobsPerTask(taskId: number): Promise<TaskJobRow> {
        return this.repository.getJobsPerTask(taskId)
    }

    async assignJobsToTask(taskId: number, jobIds: number[]): Promise<TaskRow> {}
}
