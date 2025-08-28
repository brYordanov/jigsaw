import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('❌ DATABASE_URL missing from env')

export const pool = new Pool({
    connectionString,
})

pool.on('connect', () => console.log('✅ [db] connection acquired'))
pool.on('error', err => console.error('❌ [db] pool error', err))

export async function shutdownDb() {
    console.log('✅ [db] shutting down pool…')
    await pool.end()
}
