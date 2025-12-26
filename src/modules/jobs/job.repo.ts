import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { BaseRepository } from '../../db/BaseRepository'
import { PaginatedResponse } from '../../db/types'
import { JobRow, RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './job.entity'
import { ListJobsQueryDto } from './dtos/module.dtos'

export class JobRepository extends BaseRepository {
    constructor(pool: Pool = defaultPool) {
        super(pool, TABLE_NAME_DEFAULT, RETURN_COLS_DEFAULT)
    }

    listPaginated(params: ListJobsQueryDto): Promise<PaginatedResponse<JobRow>> {
        const FILTERS_NAME = {
            job_type: { op: 'eq', value: params.job_type },
            is_enabled: { op: 'eq', value: params.is_enabled },
            name: { op: 'ilike', value: params.search },
        } as const

        const ALLOWED_SORT = ['created_at', 'updated_at', 'name'] as const

        return this.paginate<JobRow, any>({
            filterConfig: FILTERS_NAME,
            sort: params.sort,
            dir: params.dir,
            allowedSort: ALLOWED_SORT,
            limit: params.limit,
            offset: params.offset,
        })
    }
}
