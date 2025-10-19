import { PaginatedResponse } from '../../db/types'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { TaskRow } from './task.entity'
import { TaskRepository } from './task.repo'
import { TasksJobsService } from '../taks-jobs/tasks-jobs.service'
import { JobRepository } from '../jobs/job.repo'

export class TaskService {
    constructor(
        private readonly repo = new TaskRepository(),
        private readonly jobRepository = new JobRepository(),
        private readonly tasksJobsService = new TasksJobsService()
    ) {}

    async getAll(): Promise<TaskRow[]> {
        return this.repo.get()
    }

    async getByIdOrFail(id: number, include?: string[]): Promise<TaskRow> {
        const task = await this.repo.getOne({ where: { id: id }, include })
        if (!task) throw new Error('Task not found')

        return task
    }

    async getTaskWithJobs(taskId: number): Promise<TaskRow> {
        return this.getByIdOrFail(taskId, ['jobs'])
    }

    async paginate(params: ListTasksQueryDto): Promise<PaginatedResponse<TaskRow>> {
        return this.repo.listPaginated(params)
    }

    async createTask(body: CreateTaskBodyDto): Promise<TaskRow> {
        const jobIds = this.dedupe(body.jobs_ids)
        const jobs = await this.jobRepository.get({ where: { id: jobIds } })
        const missingIds = jobIds.filter(id => !jobs.find(j => j.id === id))

        if (missingIds.length > 0) {
            throw new Error(`Jobs not found: ${missingIds.join(', ')}`)
        }

        const task = await this.repo.transaction(async client => {
            const { jobs_ids, ...taskData } = body
            const created = await this.repo.create(taskData, client)
            await this.tasksJobsService.assignJobsToTask(created.id, jobs_ids, client)
            return created
        })

        return { ...task, jobs }
    }

    async updateTask(id: number, body: UpdateTaskBodyDto) {
        return this.repo.update(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }

    private dedupe(ids: string[]) {
        const set = new Set(ids)
        if (set.size !== ids.length) throw new Error('jobs_ids must be unique')
        return ids
    }
}
