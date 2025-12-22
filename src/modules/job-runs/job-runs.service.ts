import { PaginatedResponse } from '../../db/types'
import { JobRow } from '../jobs/job.entity'
import { CreateJobRunDto } from './dtos/create-job-run.dto'
import { listJobRunsQueryDto } from './dtos/module.dtos'
import { JobRun } from './job-runs.entity'
import { JobRunRepository } from './jon-runs.repository'

export class JobRunService {
    constructor(private readonly repo = new JobRunRepository()) {}

    paginate(params: listJobRunsQueryDto): Promise<PaginatedResponse<JobRun>> {
        return this.repo.listPaginated(params)
    }

    create(body: CreateJobRunDto): Promise<JobRun> {
        return this.repo.create(body)
    }

    async getByJobIdOrFail(jobId: string): Promise<JobRun[]> {
        const logs = await this.repo.get<JobRun>({ where: { jobId: jobId } })
        if (!logs) throw new Error(`Logs for jobId ${jobId} not found`)

        return logs
    }
}
