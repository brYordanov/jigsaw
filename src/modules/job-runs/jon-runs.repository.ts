import { BaseRepository } from '../../db/BaseRepository'
import { pool } from '../../db/db'
import { PaginatedResponse } from '../../db/types'
import { listJobRunsQueryDto } from './dtos/module.dtos'
import { JobRun, RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './job-runs.entity'

export class JobRunRepository extends BaseRepository {
    constructor() {
        super(pool, TABLE_NAME_DEFAULT, RETURN_COLS_DEFAULT)
    }

    listPaginated(params: listJobRunsQueryDto): Promise<PaginatedResponse<JobRun>> {
        const FILTERS_NAME = {
            job_id: 'eq',
            task_id: 'eq',
            status: 'eq',
        } as const

        const ALLOWED_SORT = ['created_at', 'job_id', 'task_id'] as const
        console.log(params)

        return this.paginate<JobRun, any>({
            filters: {
                job_id: params.searchJobId ? Number(params.searchJobId) : undefined,
                task_id: params.searchTaskId ? Number(params.searchTaskId) : undefined,
                status: params.status,
            },
            filterConfig: FILTERS_NAME,
            sort: params.sort,
            dir: params.dir,
            allowedSort: ALLOWED_SORT,
            limit: params.limit,
            offset: params.offset,
        })
    }
}
