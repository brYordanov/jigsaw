import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT, TaskRow } from './task.entity'
import { ListTasksQueryDto } from './task.dtos'
import { BaseRepository } from '../../db/BaseRepository'
import { PaginatedResponse, RelationSpec } from '../../db/types'

const JOBS_RELATION: RelationSpec = {
    join: `
    LEFT JOIN (
        SELECT
        tj.task_id AS "taskId",
        COALESCE(
            json_agg(
                json_build_object(
                    'id', j.id,
                    'name', j.name,
                    'isEnabled', j.is_enabled,
                    'position', tj.position
                )
                ORDER BY tj.position
            ) FILTER (WHERE j.id IS NOT NULL),
            '[]'
        ) AS "jobs"
        FROM tasks_jobs tj
        JOIN jobs j ON j.id = tj.job_id
        GROUP BY tj.task_id
    ) AS rJobs ON rJobs."taskId" = baseTable.id
    `,
    select: `rJobs."jobs" AS "jobs"`,
} as const

export class TaskRepository extends BaseRepository {
    constructor(pool: Pool = defaultPool) {
        super(pool, TABLE_NAME_DEFAULT, RETURN_COLS_DEFAULT, { jobs: JOBS_RELATION })
    }

    async listPaginated(params: ListTasksQueryDto): Promise<PaginatedResponse<TaskRow>> {
        const FILTERS_NAME = {
            schedule_type: 'eq',
            interval_type: 'eq',
            is_enabled: 'eq',
            name: { op: 'ilike' },
        } as const

        const ALLOWED_SORT = ['created_at', 'updated_at', 'name', 'next_run_at'] as const

        return this.paginate<TaskRow, any>({
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
