import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

export function createPool(connectionString?: string) {
    const cs = connectionString ?? process.env.DATABASE_URL
    if (!cs) throw new Error('❌ DATABASE_URL missing from env')

    const pool = new Pool({ connectionString: cs })

    pool.on('connect', () => console.log('✅ [db] connection acquired'))
    pool.on('error', err => console.error('❌ [db] pool error', err))

    return pool
}

export async function shutdownDb(pool: Pool) {
    console.log('✅ [db] shutting down pool…')
    await pool.end()
}
