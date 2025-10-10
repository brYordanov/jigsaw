import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT, TaskRow } from './task.entity'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { RepoMethods } from '../../db/queryMethods'
import { PaginatedResponse } from '../../db/types'

export class TaskRepository {
    private readonly repository: RepoMethods
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly RETURN_COLS: string = RETURN_COLS_DEFAULT,
        private readonly TABLE_NAME: string = TABLE_NAME_DEFAULT
    ) {
        this.repository = new RepoMethods(this.pool, this.TABLE_NAME, this.RETURN_COLS)
    }

    async getAll(): Promise<TaskRow[]> {
        return this.repository.getAll()
    }

    async getById(id: number): Promise<TaskRow> {
        return this.repository.getById(id)
    }

    async createTask(data: CreateTaskBodyDto): Promise<any> {
        return this.repository.create(data)
    }

    async updateTask(id: number, data: UpdateTaskBodyDto): Promise<any> {
        return this.repository.update(id, data)
    }

    async listPaginated(params: ListTasksQueryDto): Promise<PaginatedResponse<TaskRow>> {
        const FILTERS_NAME = {
            schedule_type: 'eq',
            interval_type: 'eq',
            is_enabled: 'eq',
            name: { op: 'ilike' },
        } as const

        const ALLOWED_SORT = ['created_at', 'updated_at', 'name', 'next_run_at'] as const

        return this.repository.paginate<TaskRow, any>({
            filters: {
                schedule_type: params.schedule_type,
                interval_type: params.interval_type,
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
