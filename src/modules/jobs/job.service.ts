import { PaginatedResponse } from '../../db/types'
import { CreateJobBodyDto, ListJobsQueryDto, UpdateJobBodyDto } from './job.dtos'
import { JobRow } from './job.entity'
import { JobRepository } from './job.repo'

export class JobService {
    constructor(private readonly repo = new JobRepository()) {}

    async getAll(): Promise<JobRow[]> {
        return this.repo.getAll()
    }

    async getByIdOrFail(id: number): Promise<JobRow> {
        const task = this.repo.getById(id)
        if (!task) throw new Error('Task not found')

        return task
    }

    async paginate(params: ListJobsQueryDto): Promise<PaginatedResponse<JobRow>> {
        return this.repo.listPaginated(params)
    }

    async createTask(body: CreateJobBodyDto): Promise<JobRow> {
        return this.repo.createTask(body)
    }

    async updateTask(id: number, body: UpdateJobBodyDto) {
        return this.repo.updateTask(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }
}
