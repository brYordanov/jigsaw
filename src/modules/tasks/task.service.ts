import { PaginatedResponse } from '../../db/types'
import { CreateTaskBodyDto, intervalType, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { TaskRow } from './task.entity'
import { TaskRepository } from './task.repo'
import { TasksJobsService } from '../taks-jobs/tasks-jobs.service'
import { JobRepository } from '../jobs/job.repo'
import { calculateNextRunAt } from './intervalHelpers'

export class TaskService {
    constructor(
        private readonly repo: TaskRepository,
        private readonly jobRepository: JobRepository,
        private readonly tasksJobsService: TasksJobsService
    ) {}

    async getAll(): Promise<TaskRow[]> {
        return this.repo.get()
    }

    async getByIdOrFail(id: string, include?: string[]): Promise<TaskRow> {
        const task = await this.repo.getOne({ where: { id: id }, include })
        if (!task) throw new Error('Task not found')

        return task
    }

    async getTaskWithJobs(taskId: string): Promise<TaskRow> {
        return this.getByIdOrFail(taskId, ['jobs'])
    }

    async paginate(params: ListTasksQueryDto): Promise<PaginatedResponse<TaskRow>> {
        return this.repo.listPaginated(params)
    }

    async createTask(body: CreateTaskBodyDto): Promise<TaskRow> {
        const jobIds = this.dedupe(body.jobs_ids)
        const jobs = await this.jobRepository.get({ where: { id: jobIds } })
        const missingIds = jobIds.filter(id => !jobs.find(j => j.id === id))
        const next_run_at = calculateNextRunAt(new Date(), {
            interval_type: body.interval_type,
            days_of_month: body.days_of_month,
            hours: body.hours,
            minutes: body.minutes,
        })

        if (missingIds.length > 0) {
            throw new Error(`Jobs not found: ${missingIds.join(', ')}`)
        }

        const task = await this.repo.transaction(async client => {
            const { jobs_ids, ...taskData } = body
            const created = await this.repo.create({ ...taskData, next_run_at }, client)
            await this.tasksJobsService.assignJobsToTask(created.id, jobs_ids, client)
            return created
        })

        return { ...task, jobs }
    }

    async updateTask(id: string, body: UpdateTaskBodyDto, currentIntervalType: intervalType) {
        const jobIds = this.dedupe(body.jobs_ids)
        const jobs = await this.jobRepository.get({ where: { id: jobIds } })
        const missingIds = jobIds.filter(id => !jobs.find(j => j.id === id))
        if (missingIds.length > 0) {
            throw new Error(`Jobs not found: ${missingIds.join(', ')}`)
        }

        const next_run_at = calculateNextRunAt(new Date(), {
            interval_type: body.interval_type || currentIntervalType,
            days_of_month: body.days_of_month,
            hours: body.hours,
            minutes: body.minutes,
        })

        const task = await this.repo.transaction(async client => {
            const { jobs_ids, ...taskData } = body
            const updated = await this.repo.update(id, { ...taskData, next_run_at }, client)
            await this.tasksJobsService.assignJobsToTask(updated.id, jobs_ids, client)
            return updated
        })

        return { ...task, jobs }
    }

    async deleteById(id: string): Promise<void> {
        await this.repo.deleteById(id)
    }

    private dedupe(ids: string[]) {
        const set = new Set(ids)
        if (set.size !== ids.length) throw new Error('jobs_ids must be unique')
        return ids
    }
}
