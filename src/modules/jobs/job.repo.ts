import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RepoMethods } from '../../db/queryMethods'
import { PaginatedResponse } from '../../db/types'
import { JobRow, RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './job.entity'
import { CreateJobBodyDto, ListJobsQueryDto } from './job.dtos'
import { UpdateTaskBodyDto } from '../tasks/task.dtos'

export class JobRepository {
    private readonly repository: RepoMethods
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly RETURN_COLS: string = RETURN_COLS_DEFAULT,
        private readonly TABLE_NAME: string = TABLE_NAME_DEFAULT
    ) {
        this.repository = new RepoMethods(this.pool, this.TABLE_NAME, this.RETURN_COLS)
    }

    async getAll(): Promise<JobRow[]> {
        return this.repository.getAll()
    }

    async getById(id: number): Promise<JobRow> {
        return this.repository.getById(id)
    }

    async createTask(data: CreateJobBodyDto): Promise<any> {
        return this.repository.create(data)
    }

    async updateTask(id: number, data: UpdateTaskBodyDto): Promise<any> {
        return this.repository.update(id, data)
    }

    async listPaginated(params: ListJobsQueryDto): Promise<PaginatedResponse<JobRow>> {
        const FILTERS_NAME = {
            job_type: 'eq',
            is_enabled: 'eq',
            name: { op: 'ilike' },
        } as const

        const ALLOWED_SORT = ['created_at', 'updated_at', 'name'] as const

        return this.repository.paginate<JobRow, any>({
            filters: {
                job_type: params.job_type,
                is_enabled: params.is_enabled,
                name: params.search,
            },
            filterConfig: FILTERS_NAME,
            sort: params.sort,
            dir: params.dir,
            allowedSort: ALLOWED_SORT,
            limit: params.limit,
            offset: params.offset,
        })
    }

    async deleteById(id: number): Promise<void> {
        this.repository.deleteById(id)
    }
}
