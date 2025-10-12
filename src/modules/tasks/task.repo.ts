import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT, TaskRow } from './task.entity'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { RepoMethods } from '../../db/queryMethods'
import { PaginatedResponse, RelationSpec } from '../../db/types'
import { TasksJobsRepository } from '../taks-jobs/tasks-jobs.repo'

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

export class TaskRepository {
    private readonly repository: RepoMethods
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly RETURN_COLS: string = RETURN_COLS_DEFAULT,
        private readonly TABLE_NAME: string = TABLE_NAME_DEFAULT,
        private readonly relations = { jobs: JOBS_RELATION },
        private taskJobsRepo = new TasksJobsRepository(pool)
    ) {
        this.repository = new RepoMethods(
            this.pool,
            this.TABLE_NAME,
            this.RETURN_COLS,
            this.relations
        )
    }

    async getAll(): Promise<TaskRow[]> {
        return this.repository.getAll()
    }

    async getById(id: number, include?: string[]): Promise<TaskRow> {
        const task = await this.repository.getOne({ where: { id: id }, include })
        return task
    }

    async createTask(data: CreateTaskBodyDto): Promise<any> {
        const { jobs_ids, ...taskData } = data
        const jobIds = this.dedupe(jobs_ids)

        const client = await this.pool.connect()

        try {
            const task = await this.repository.create(taskData, client)
            const taskId = task.id
            await this.taskJobsRepo.replaceForTaskTx(taskId, jobIds, client)

            await client.query('COMMIT')
            return { ...task, jobIds }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
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

    private dedupe(ids: number[]) {
        const set = new Set(ids)
        if (set.size !== ids.length) throw new Error('jobs_ids must be unique')
        return ids
    }
}
