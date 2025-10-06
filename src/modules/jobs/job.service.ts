import { PaginatedResponse } from '../../db/types'
import { CreateJobBodyDto, ListJobsQueryDto, UpdateJobBodyDto, validateJobConfig } from './job.dtos'
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

    async createJob(body: CreateJobBodyDto): Promise<JobRow> {
        validateJobConfig(body.job_type, body.config)
        return this.repo.createTask(body)
    }

    async updateJob(id: number, body: UpdateJobBodyDto) {
        const job = await this.getByIdOrFail(id)
        if (body.config) {
            const jobType = body.job_type ? body.job_type : job.job_type
            validateJobConfig(jobType, body.config)
        }
        return this.repo.updateTask(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }
}
