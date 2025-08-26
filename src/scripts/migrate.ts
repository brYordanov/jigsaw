import fs from 'fs'
import path from "path";
import { Pool } from "pg";
import crypto from 'crypto'
import * as dotenv from 'dotenv'
dotenv.config()

const MIGRATIONS_DIR = path.resolve('src/migrations');
const pool = new Pool({ connectionString: process.env.DATABASE_URL})

function sha256(s:string) {
    return crypto.createHash('sha256').update(s, 'utf-8').digest('hex')
}

function listMigrations(direction: 'up' | 'down') {
    const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith(`.${direction}.sql`))
    .map(file => {
        const match = file.match(/^(\d+)_.*\.(up|down)\.sql$/)
        if(!match) throw new Error(`Migration bad name: ${file}`)
        return { id: parseInt(match[1], 10), name: file, fullPath: path.join(MIGRATIONS_DIR, file) }
    })
    .sort((a, b) => a.id - b.id)
}

async function ensureTrakingTableExists(client:any) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        version INT NOT NULL,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        direction TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `)
    await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_schema_migrations_up
        ON schema_migrations(version) WHERE direction = 'up';
    `)
}

async function useClient<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const c = await pool.connect()
    try {
        return await callback(c)
    } finally {
        c.release()
    }
} 

async function lock(client: any) {
    const {rows} = await client.query('SELECT pg_try_advisory_lock(777777)')
    if(!rows[0].pg_try_advisory_lock) throw new Error('Migration lock busy')
}

async function unlock(client:any) {
    await client.query('SELECT pg_advisory_unlock(777777)')
}

async function getAppliedMigrations(client:any) {
    const { rows } = await client.query(`SELECT version FROM schema_migrations WHERE direction='up'`)
    return new Set(rows.map((r: any) => r.version))
}

async function runSqlTransaction(client: any, sql: string) {
    await client.query('BEGIN')
    try {
        await client.query(sql)
        await client.query('COMMIT')
    } catch(err) {
        await client.query('ROLLBACK')
        throw err
    }
}