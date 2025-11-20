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

    create(body: CreateJobRunDto): Promise<JobRow> {
        return this.repo.create(body)
    }
}
