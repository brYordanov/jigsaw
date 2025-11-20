import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import crypto from 'crypto'
import * as dotenv from 'dotenv'
dotenv.config()

enum Commands {
    Up = 'up',
    Down = 'down',
    Status = 'status',
}

const commands: Record<Commands, () => Promise<void>> = {
    [Commands.Up]: up,
    [Commands.Down]: down,
    [Commands.Status]: status,
}

enum MigrateDirection {
    Up = 'up',
    Down = 'down',
}

type Migration = {
    id: number
    version: number
    name: string
    hash: string
    executed_at: string
}

const MIGRATIONS_DIR = path.resolve('src/migrations')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function isCommand(x: string): x is Commands {
    return (Object.values(Commands) as string[]).includes(x)
}

function sha256(s: string): string {
    return crypto.createHash('sha256').update(s, 'utf-8').digest('hex')
}

function listMigrations(direction: MigrateDirection) {
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith(`.${direction}.sql`))
        .map(file => {
            const match = file.match(/^(\d+)_.*\.(up|down)\.sql$/)
            if (!match) throw new Error(`❌ Migration bad name: ${file}`)
            return {
                version: parseInt(match[1], 10),
                name: file,
                fullPath: path.join(MIGRATIONS_DIR, file),
            }
        })
        .sort((a, b) => a.version - b.version)

    return files
}

async function ensureTrakingTableExists(client: any): Promise<void> {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id BIGSERIAL PRIMARY KEY,
            version INT NOT NULL,
            name TEXT NOT NULL,
            hash TEXT NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
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

async function lock(client: any): Promise<void> {
    const { rows } = await client.query('SELECT pg_try_advisory_lock(777777)')
    if (!rows[0].pg_try_advisory_lock) throw new Error('❌ Migration lock busy')
}

async function unlock(client: any): Promise<void> {
    await client.query('SELECT pg_advisory_unlock(777777)')
}

async function getAppliedMigrationsMap(client: any): Promise<Map<number, Migration>> {
    const { rows: migrations } = await client.query(
        `SELECT version, name, hash FROM schema_migrations`
    )
    if (migrations.length === 0) {
        console.log('✅ No migrations applied yet.')
    }

    return new Map(migrations.map((row: Migration) => [row.version, row]))
}

async function runSqlTransaction(client: any, sql: string): Promise<void> {
    await client.query('BEGIN')
    try {
        await client.query(sql)
        await client.query('COMMIT')
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    }
}

async function recordMigrationApply(
    client: any,
    migrationVersion: number,
    migrationName: string,
    migrationHash: string
): Promise<void> {
    await client.query(`INSERT INTO schema_migrations(version, name, hash) VALUES ($1,$2,$3)`, [
        migrationVersion,
        migrationName,
        migrationHash,
    ])
}

async function recordMigrationRevert(client: any, migrationVersion: number): Promise<void> {
    await client.query(`DELETE FROM schema_migrations WHERE version=$1`, [migrationVersion])
}

async function getLatestAppliedMigration(client: any): Promise<Migration | null> {
    const { rows } = await client.query(
        `SELECT version, name
        FROM schema_migrations
        ORDER BY version DESC
        LIMIT 1`
    )

    if (rows.length === 0) {
        console.log('✅ Nothing to revert.')
        return null
    }

    return rows[0]
}

function checkMigrationForUnappliedChanges(migrationFile: any, appliedMigration: Migration) {
    if (!appliedMigration) return
    const sql = fs.readFileSync(migrationFile.fullPath, 'utf-8')
    const hash = sha256(sql)
    if (hash !== appliedMigration.hash) {
        console.warn(
            `⚠️⚠️⚠️ Migration file has been modified since it was applied: ${migrationFile.name}`
        )
    }
}

async function up(): Promise<void> {
    await useClient(async client => {
        await ensureTrakingTableExists(client)
        await lock(client)

        try {
            const migrationFiles = await listMigrations(MigrateDirection.Up)
            const appliedMigrationsMap = await getAppliedMigrationsMap(client)

            let count = 0

            for (const file of migrationFiles) {
                checkMigrationForUnappliedChanges(file, appliedMigrationsMap.get(file.version)!)
                if (appliedMigrationsMap.has(file.version)) continue
                const sql = fs.readFileSync(file.fullPath, 'utf-8')
                await runSqlTransaction(client, sql)
                await recordMigrationApply(client, file.version, file.name, sha256(sql))
                console.log(`✅ Applied migration: ${file.name}`)
                count++
            }

            if (count !== 0) return
            console.log('✅✅✅ Already up to date.')
        } finally {
            await unlock(client)
        }
    })
}

async function down(): Promise<void> {
    await useClient(async client => {
        await ensureTrakingTableExists(client)
        await lock(client)

        try {
            const lastMigration = await getLatestAppliedMigration(client)
            if (!lastMigration) return
            const downFile = path.join(
                MIGRATIONS_DIR,
                lastMigration.name.replace('.up.sql', '.down.sql')
            )
            if (!fs.existsSync(downFile)) {
                throw new Error(`❌ Down migration file not found: ${downFile}`)
            }

            const sql = fs.readFileSync(downFile, 'utf-8')
            await runSqlTransaction(client, sql)
            await recordMigrationRevert(client, lastMigration.version)
            console.log(`✅ Reverted migration: ${lastMigration.name}`)
        } finally {
            await unlock(client)
        }
    })
}

async function status() {
    await useClient(async client => {
        await ensureTrakingTableExists(client)
        const appliedMigrationsMap = await getAppliedMigrationsMap(client)

        console.log('Applied migrations:')
        Array.from(appliedMigrationsMap.values())
            .sort((a, b) => a.version - b.version)
            .forEach(m => console.log(`     ${m.version}: ${m.name}`))

        const pending = listMigrations(MigrateDirection.Up).filter(
            file => !appliedMigrationsMap.has(file.version)
        )
        console.log('\nPending:')
        if (pending.length === 0) console.log('  (none)')
        else pending.forEach(p => console.log(`     ${p.version}: ${p.name}`))
    })
}

async function main() {
    const arg = process.argv[2]
    if (!arg || !isCommand(arg)) {
        console.error('❌ Invalid command.')
        console.warn(
            `⚠️ Usage: ts-node src/scripts/migrate.ts:<${Object.values(Commands).join('|')}>`
        )
        process.exit(1)
    }
    const fn = commands[arg]
    await fn()
    await pool.end()
    console.log('❤️❤️❤️ All done ❤️❤️❤️')
}

main().catch(err => {
    console.error(`❌ ${err}`)
    process.exit(1)
})
