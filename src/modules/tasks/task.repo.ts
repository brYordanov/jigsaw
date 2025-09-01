import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { CreateTaskBody, UpdateTaskBody } from './task.dtos'
import { TaskRow } from './task.entity'
import { getById } from '../../db/queryMethods'

const DEFAULT_COLS = ` id, name, description, is_single_time_only, is_enabled,
  schedule_type, interval_type, days, hours, minutes, last_run_at, next_run_at, 
  timeout_seconds, last_ping_at, expires_at,
  created_at, updated_at` as const

const TABLE_NAME = 'tasks' as const

export class TaskRepository {
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly COLS: string = DEFAULT_COLS
    ) {}

    async getById(id: number): Promise<TaskRow> {
        const { rows } = await getById(this.pool, this.COLS, TABLE_NAME, id)
        return rows[0] ?? null
    }

    async createTask(data: CreateTaskBody): Promise<TaskRow> {
        const q = `
            INSERT INTO tasks(
                name, description, is_single_time_only, is_enabled,
                schedule_type, interval_type,
                days, hours, minutes,
                timeout_seconds, last_ping_at, expires_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING ${this.COLS}
            `

        const queryConfig = [
            data.name,
            data.description ?? null,
            data.is_single_time_only ?? true,
            data.is_enabled ?? true,
            data.schedule_type,
            data.interval_type,
            data.days ?? null,
            data.hours ?? null,
            data.minutes ?? null,
            data.timeout_seconds ?? null,
            data.last_ping_at ?? null,
            data.expires_at ?? null,
        ]

        const { rows } = await this.pool.query(q, queryConfig)

        return rows[0]
    }

    async updateTask(id: number, data: UpdateTaskBody): Promise<any> {
        const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
        if (!entries.length) {
            const { rows } = await this.pool.query(`SELECT ${this.COLS} FROM tasks WHERE id=$1`, [
                id,
            ])
            return rows
        }

        const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ')
        const values = entries.map(([_, v]) => v)
        values.push(id)
        const { rows } = await this.pool.query({
            text: `UPDATE tasks SET ${sets} WHERE id=$${values.length} RETURNING ${this.COLS}`,
            values,
        })

        return rows
    }
}
