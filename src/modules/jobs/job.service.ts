import { PaginatedResponse } from '../../db/types'
import { CreateJobBodyDto } from './dtos/create-job.dto'
import { UpdateJobBodyDto } from './dtos/update-job.dto'
import { ListJobsQueryDto, validateJobConfig } from './dtos/module.dtos'
import { JobRow } from './job.entity'
import { JobRepository } from './job.repo'

export class JobService {
    constructor(private readonly repo: JobRepository) {}

    getAll(): Promise<JobRow[]> {
        return this.repo.get()
    }

    async getByIdOrFail(id: string): Promise<JobRow> {
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

    async updateJob(id: string, body: UpdateJobBodyDto) {
        const job = await this.getByIdOrFail(id)
        if (body.config) {
            const jobType = body.job_type ? body.job_type : job.job_type
            validateJobConfig(jobType, body.config)
        }
        return this.repo.update<JobRow>(id, body)
    }

    async deleteById(id: string): Promise<void> {
        await this.repo.deleteById(id)
    }

    getManyJobsById(ids: string[]): Promise<JobRow[]> {
        return this.repo.get<JobRow>({ where: { id: ids } })
    }
}
