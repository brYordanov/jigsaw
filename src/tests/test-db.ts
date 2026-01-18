import { createPool } from '../db/db'

const createTestPool = () => {
    const testConnectionStr = process.env.TEST_DATABASE_URL
    if (!testConnectionStr) throw new Error('❌ Missing Test Connection String')
    return createPool(testConnectionStr)
}

export const testPool = createTestPool()

export const resetTestTables = async () => {
    await testPool.query('TRUNCATE TABLE tasks, jobs, tasks_jobs RESTART IDENTITY CASCADE')
}
