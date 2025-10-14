import { PaginatedResponse } from '../../db/types'
import { CreateJobBodyDto, ListJobsQueryDto, UpdateJobBodyDto, validateJobConfig } from './job.dtos'
import { JobRow } from './job.entity'
import { JobRepository } from './job.repo'

export class JobService {
    constructor(private readonly repo = new JobRepository()) {}

    getAll(): Promise<JobRow[]> {
        return this.repo.get()
    }

    async getByIdOrFail(id: number): Promise<JobRow> {
        const task = await this.repo.getOne<JobRow>({ where: { id: id } })
        if (!task) throw new Error('Task not found')

        return task
    }

    paginate(params: ListJobsQueryDto): Promise<PaginatedResponse<JobRow>> {
        return this.repo.listPaginated(params)
    }

    createJob(body: CreateJobBodyDto): Promise<JobRow> {
        validateJobConfig(body.job_type, body.config)
        return this.repo.create<JobRow>(body)
    }

    async updateJob(id: number, body: UpdateJobBodyDto) {
        const job = await this.getByIdOrFail(id)
        if (body.config) {
            const jobType = body.job_type ? body.job_type : job.job_type
            validateJobConfig(jobType, body.config)
        }
        return this.repo.update<JobRow>(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }

    getManyJobsByid(ids: number[]): Promise<JobRow[]> {
        return this.repo.get<JobRow>({ where: { id: ids } })
    }
}
