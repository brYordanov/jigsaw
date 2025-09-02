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
        // const where: string[] = []
        // const vals: any[] = []
        // let i = 1

        // if (params.schedule_type) {
        //     where.push(`schedule_type = $${i++}`)
        //     vals.push(params.schedule_type)
        // }
        // if (params.interval_type) {
        //     where.push(`interval_type = $${i++}`)
        //     vals.push(params.interval_type)
        // }
        // if (params.interval_type) {
        //     where.push(`is_enabled = $${i++}`)
        //     vals.push(params.is_enabled)
        // }
        // if (params.search) {
        //     where.push(`name ILIKE $${i++}`)
        //     vals.push(`%${params.search}%`)
        // }

        // const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
        // const sort: sortOptionsType = sortOptionsSchema.parse(params.sort)

        // const listSql = `
        //     SELECT ${this.COLS}
        //     FROM ${TABLE_NAME}
        //     ${whereSql}
        //     ORDER BY ${sort} ${params.dir}
        //     LIMIT $${i++} OFFSET $${i++}
        // `

        // const listVals = [...vals, params.limit, params.offset]

        // const countSql = `
        //     SELECT COUNT(*)::int AS count FROM tasks ${whereSql}
        // `
        // const [rowRes, countRes] = await Promise.all([
        //     this.pool.query<TaskRow>(listSql, listVals),
        //     this.pool.query<{ count: number }>(countSql, vals),
        // ])

        // return {
        //     items: rowRes.rows,
        //     total: countRes.rows[0].count,
        //     limit: params.limit,
        //     offset: params.offset,
        // }
        return paginate(this.pool, TABLE_NAME, this.COLS, params)
    }
}
