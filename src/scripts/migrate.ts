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
    Generate = 'generate',
}

const commands: Record<Commands, () => Promise<void>> = {
    [Commands.Up]: up,
    [Commands.Down]: down,
    [Commands.Status]: status,
    [Commands.Generate]: generate,
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

const createPool = () => {
    const isTest = process.env.NODE_ENV === 'test'

    const connectionString = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL

    if (!connectionString) {
        throw new Error('Database connection string is missing')
    }

    if (isTest && !connectionString.includes('test')) {
        throw new Error('Refusing to run in TEST mode without a test database URL')
    }

    return new Pool({ connectionString })
}

const pool = createPool()

function isCommand(x: string): x is Commands {
    return (Object.values(Commands) as string[]).includes(x)
}

function sha256(s: string): string {
    return crypto.createHash('sha256').update(s, 'utf-8').digest('hex')
}

function ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
        throw new Error(`Migrations folder not found: ${dir}`)
    }
    const stat = fs.statSync(dir)
    if (!stat.isDirectory()) {
        throw new Error(`Migrations path is not a directory: ${dir}`)
    }
}

function getNextMigrationNumber(dir: string) {
    const files = fs.readdirSync(dir)

    let max = -1

    for (const file of files) {
        const m = /^(\d+)_.*\.(up|down)\.sql$/i.exec(file)
        if (!m) continue

        const n = Number(m[1])
        if (Number.isFinite(n)) max = Math.max(max, n)
    }

    return max + 1
}

function writeEmptyMigration(filePath: string) {
    fs.writeFileSync(filePath, '', { encoding: 'utf8', flag: 'wx' })
}

function slugify(input: string) {
    return String(input)
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
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

async function generate() {
    ensureDirExists(MIGRATIONS_DIR)
    const rawName = process.argv.slice(3).join(' ')

    if (!rawName) {
        console.error(
            `⚠️Missing migration name.\n\nExample:\n  npm run migrate:generate -- "add-index-to-jobs"\n`
        )
        process.exit(1)
    }

    const name = slugify(rawName)
    if (!name) {
        console.error(`⚠️Migration name became empty after slugify. Input: "${rawName}"`)
        process.exit(1)
    }

    const next = getNextMigrationNumber(MIGRATIONS_DIR)
    const up = path.join(MIGRATIONS_DIR, `${next}_${name}.up.sql`)
    const down = path.join(MIGRATIONS_DIR, `${next}_${name}.down.sql`)

    try {
        writeEmptyMigration(up)
        writeEmptyMigration(down)
    } catch (err: any) {
        if (err && err.code === 'EEXIST') {
            console.error(`File already exists. Aborting.\n- ${up}\n- ${down}`)
            process.exit(1)
        }
        throw err
    }

    console.log(
        `✅ Created:\n- ${path.relative(process.cwd(), up)}\n- ${path.relative(process.cwd(), down)}`
    )
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
