import type { Pool } from 'pg'
import { createPool } from '../db/db'

export const createTestPool = () => {
    const testConnectionStr = process.env.TEST_DATABASE_URL
    if (!testConnectionStr) throw new Error('❌ Missing Test Connection String')
    return createPool(testConnectionStr)
}

export const resetTestTables = async (pool: Pool) => {
    await pool.query('TRUNCATE TABLE tasks, jobs, tasks_jobs RESTART IDENTITY CASCADE')
}
