import { Pool } from 'pg'
import { pool as defaultPool } from '../../db/db'
import { RETURN_COLS_DEFAULT, TABLE_NAME_DEFAULT } from './tasks-jobs.entity'
import { JobRow } from '../jobs/job.entity'
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

    async getJobsPerTask(taskId):Promise<JobRow> {
        return this.
    }
}
