import { PaginatedResponse } from '../../db/types'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
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

    async getById(id: string, include?: string[]): Promise<TaskRow | null> {
        return this.repo.getOne({ where: { id: id }, include })
    }

    async getByIdOrFail(id: string, include?: string[]): Promise<TaskRow> {
        const task = await this.getById(id, include)
        if (!task) throw new Error('Task not found')

        return task
    }

    async getTaskWithJobs(taskId: string): Promise<TaskRow> {
        return this.getByIdOrFail(taskId, ['jobs'])
    }

    async getDueTasks(time: Date): Promise<TaskRow[]> {
        return this.repo.get({
            where: {
                is_enabled: true,
                next_run_at: { op: 'lte', value: time },
            },
            dir: 'ASC',
            orderBy: 'next_run_at',
        })
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
            days_of_week: body.days_of_week,
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

    async updateTask(id: string, body: UpdateTaskBodyDto) {
        const currentTask = await this.getByIdOrFail(id)
        const hasJobsUpdate = Array.isArray(body.jobs_ids)
        let jobIds: string[] = []
        let jobs = []

        if (hasJobsUpdate) {
            jobIds = this.dedupe(body.jobs_ids!)

            const foundJobs = await this.jobRepository.get({
                where: { id: jobIds },
            })

            const missingIds = jobIds.filter(id => !foundJobs.find(j => j.id === id))
            if (missingIds.length > 0) {
                throw new Error(`Jobs not found: ${missingIds.join(', ')}`)
            }

            jobs = foundJobs
        } else {
            jobs = await this.tasksJobsService.getJobsForTask(id)
        }

        const next_run_at =
            body.next_run_at === undefined
                ? calculateNextRunAt(new Date(), {
                      interval_type: body.interval_type || currentTask.interval_type,
                      days_of_month: body.days_of_month || currentTask.days_of_month,
                      days_of_week: body.days_of_week || currentTask.days_of_week,
                      hours: body.hours || currentTask.hours,
                      minutes: body.minutes || currentTask.minutes,
                  })
                : body.next_run_at

        const task = await this.repo.transaction(async client => {
            const { jobs_ids, ...taskData } = body

            const updated = await this.repo.update(id, { ...taskData, next_run_at }, client)

            if (hasJobsUpdate) {
                await this.tasksJobsService.assignJobsToTask(updated.id, jobIds, client)
            }

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
