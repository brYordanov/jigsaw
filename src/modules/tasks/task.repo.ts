import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { TaskRow } from './task.entity'
import { create, getAll, getById, paginate, update } from '../../db/queryMethods'
import {
    CreateTaskBodyDto,
    ListTasksQueryDto,
    sortOptionsSchema,
    sortOptionsType,
    UpdateTaskBodyDto,
} from './task.dtos'
import { PaginatedResponse } from './task.type'

const DEFAULT_COLS = `id, name, description, is_single_time_only, is_enabled,
  schedule_type, interval_type, days, hours, minutes, last_run_at, next_run_at, 
  timeout_seconds, last_ping_at, expires_at,
  created_at, updated_at` as const

const TABLE_NAME = 'tasks' as const

export class TaskRepository {
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly COLS: string = DEFAULT_COLS
    ) {}

    async getAll(): Promise<TaskRow[]> {
        return getAll(this.pool, this.COLS, TABLE_NAME)
    }

    async getById(id: number): Promise<TaskRow> {
        return getById(this.pool, this.COLS, TABLE_NAME, id)
    }

    async createTask(data: CreateTaskBodyDto): Promise<any> {
        return create(this.pool, TABLE_NAME, this.COLS, data)
    }

    async updateTask(id: number, data: UpdateTaskBodyDto): Promise<any> {
        return update(this.pool, TABLE_NAME, this.COLS, id, data)
    }

    async listPaginated(params: ListTasksQueryDto): Promise<PaginatedResponse> {
        const FILTERS_NAME = {
            schedule_type: 'eq',
            interval_type: 'eq',
            is_enabled: 'eq',
            name: { op: 'ilike' },
        } as const

        const ALLOWED_SORT = ['created_at', 'updated_at', 'name', 'next_run_at'] as const

        return paginate<TaskRow, any>({
            pool: this.pool,
            table: TABLE_NAME,
            returnCols: this.COLS,
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
}
