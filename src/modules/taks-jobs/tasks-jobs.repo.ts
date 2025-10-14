import { Pool, PoolClient } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './tasks-jobs.entity'
import { BaseRepository } from '../../db/BaseRepository'

export class TasksJobsRepository extends BaseRepository {
    constructor(pool: Pool = defaultPool) {
        super(pool, TABLE_NAME_DEFAULT, RETURN_COLS_DEFAULT)
    }

    async replaceForTaskTx(taskId: number, jobIds: number[], client?: PoolClient): Promise<void> {
        const db = this.runner(client)
        await db.query(`DELETE FROM ${this.tableName} WHERE task_id = $1`, [taskId])
        if (jobIds.length === 0) return

        await db.query(
            `
            INSERT INTO tasks_jobs (task_id, job_id, position)
            SELECT $1, j.job_id, j.pos
            FROM UNNEST($2::bigint[]) WITH ORDINALITY AS j(job_id, pos)
            `,
            [taskId, jobIds]
        )
    }
}
