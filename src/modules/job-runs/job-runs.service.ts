import { PaginatedResponse } from '../../db/types'
import { listJobRunsQueryDto } from './dtos/module.dtos'
import { JobRun } from './job-runs.entity'
import { JobRunRepository } from './jon-runs.repository'

export class JobRunService {
    constructor(private readonly repo = new JobRunRepository()) {}

    paginate(params: listJobRunsQueryDto): Promise<PaginatedResponse<JobRun>> {
        return this.repo.listPaginated(params)
    }
}
