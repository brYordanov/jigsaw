import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './tasks-jobs.entity'
import { RepoMethods } from '../../db/queryMethods'

export class TasksJobsRepository {
    private readonly repository: RepoMethods
    constructor(
        private readonly pool: Pool = defaultPool,
        private readonly RETURN_COLS: string = RETURN_COLS_DEFAULT,
        private readonly TABLE_NAME: string = TABLE_NAME_DEFAULT
    ) {
        this.repository = new RepoMethods(this.pool, this.TABLE_NAME, this.RETURN_COLS)
    }

    async replaceForTaskTx(
        taskId: number,
        jobIds: number[],
        client?: import('pg').PoolClient
    ): Promise<void> {
        await this.pool.query(`DELETE FROM ${this.TABLE_NAME} WHERE task_id = $1`, [taskId])
        if (jobIds.length === 0) return

        const runner = client ?? this.pool
        await runner.query(
            `
            INSERT INTO tasks_jobs (task_id, job_id, position)
            SELECT $1, j.job_id, j.pos
            FROM UNNEST($2::bigint[]) WITH ORDINALITY AS j(job_id, pos)
            `,
            [taskId, jobIds]
        )
    }
}
