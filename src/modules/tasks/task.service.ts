import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { PaginatedResponse } from '../../db/types'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { TaskRow } from './task.entity'
import { TaskRepository } from './task.repo'
import { TasksJobsService } from '../taks-jobs/tasks-jobs.service'
import { JobRepository } from '../jobs/job.repo'

export class TaskService {
    constructor(
        private readonly pool: Pool = defaultPool,
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
        const jobs = await this.jobRepository.get({ where: { id: [jobIds] } })
        const client = await this.pool.connect()
        try {
            await client.query('BEGIN')

            const { jobs_ids, ...taskData } = body
            const task = await this.repo.create(taskData, client)

            await this.tasksJobsService.assignJobsToTask(task.id, jobIds, client)

            await client.query('COMMIT')

            return { ...task, jobs }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    }

    async updateTask(id: number, body: UpdateTaskBodyDto) {
        return this.repo.update(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }

    private dedupe(ids: number[]) {
        const set = new Set(ids)
        if (set.size !== ids.length) throw new Error('jobs_ids must be unique')
        return ids
    }
}
