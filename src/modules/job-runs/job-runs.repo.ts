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
        const FILTERS_CONFIG = {
            job_id: {
                op: 'eq',
                value: params.searchJobId ? Number(params.searchJobId) : undefined,
            },
            task_id: {
                op: 'eq',
                value: params.searchTaskId ? Number(params.searchTaskId) : undefined,
            },
            status: { op: 'eq', value: params.status },
            after_date: {
                op: 'date_gte',
                fieldName: 'created_at',
                value: params.after_date || undefined,
            },
            before_date: {
                op: 'date_lte',
                fieldName: 'created_at',
                value: params.before_date || undefined,
            },
        } as const

        const ALLOWED_SORT = ['created_at', 'job_id', 'task_id'] as const
        return this.paginate<JobRun, any>({
            filterConfig: FILTERS_CONFIG,
            sort: params.sort,
            dir: params.dir,
            allowedSort: ALLOWED_SORT,
            limit: params.limit,
            offset: params.offset,
        })
    }
}
