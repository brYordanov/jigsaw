import { describe, it, expect, vi } from 'vitest'
import type { Pool } from 'pg'
import { BaseRepository } from '../../db/BaseRepository'
import { json } from 'zod'

class TestRepo extends BaseRepository {
    constructor(pool: Pool) {
        super(pool, 'jobs', 'baseTable.*', {
            runs: {
                select: 'jr.id as run_id, jr.status as run_status',
                join: 'LEFT JOIN job_runs jr ON jr.job_id = baseTable.id',
            },
        })
    }
}

const createTestDeps = () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const pool = { query: queryMock } as unknown as Pool
    const repo = new TestRepo(pool)
    return { queryMock, repo }
}

describe('BaseRepository.get', () => {
    it('builds WHERE with ilike + in + gte', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({
            where: {
                name: { op: 'ilike', value: 'abc' },
                status: { op: 'in', value: ['ok', 'failed'] },
                attempts: { op: 'gte', value: 3 },
            },
            orderBy: 'created_at',
            dir: 'DESC',
            limit: 10,
        })

        expect(queryMock).toHaveBeenCalledTimes(1)
        const [sql, values] = queryMock.mock.calls[0]

        expect(sql).toContain('WHERE baseTable.name ILIKE $1')
        expect(values).toEqual(['%abc%', ['ok', 'failed'], 3])
    })

    it('when include is provided, uses relation joins/selects', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({ include: ['runs'] })

        const [sql] = queryMock.mock.calls[0]
        expect(sql).toContain('LEFT JOIN job_runs jr ON jr.job_id = baseTable.id')
        expect(sql).toContain('jr.id as run_id')
    })

    it('dedupes include keys', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({ include: ['runs', 'runs'] })

        const [sql] = queryMock.mock.calls[0]

        expect(sql.match(/LEFT JOIN job_runs/g).length).toBe(1)
    })

    it('throws err on unknown include', async () => {
        const { queryMock, repo } = createTestDeps()
        await expect(repo.get({ include: ['non-existent'] })).rejects.toThrow(
            'Unknown include: non-existent'
        )
    })

    it('supports date_gte/date_lte casting', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({
            where: {
                created_at: { op: 'date_gte', value: '2026-01-01' },
                updated_at: { op: 'date_lte', value: '2026-12-12' },
            },
        })

        const [sql, values] = queryMock.mock.calls[0]
        expect(sql).toContain('baseTable.created_at >= $1::date')
        expect(sql).toContain('baseTable.updated_at <= $2::date')
        expect(values).toEqual(['2026-01-01', '2026-12-12'])
    })

    it('in operator with empty array yields FALSE and no param increment', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({
            where: {
                status: [],
                attempts: { op: 'gte', value: 1 },
            },
        })

        const [sql, values] = queryMock.mock.calls[0]
        expect(sql).toContain('WHERE FALSE AND baseTable.attempts >= $1')
        expect(values).toEqual([1])
    })

    it('supports is operator (null/ not null)', async () => {
        const { queryMock, repo } = createTestDeps()
        await repo.get({
            where: {
                created_at: { op: 'is', value: 'null' },
            },
        })

        let [sql] = queryMock.mock.calls[0]

        expect(sql).toContain('WHERE baseTable.created_at IS NULL')
        queryMock.mockClear()

        await repo.get({
            where: {
                created_at: { op: 'is', value: 'not null' },
            },
        })
        ;[sql] = queryMock.mock.calls[0]
        expect(sql).toContain('WHERE baseTable.created_at IS NOT NULL')
    })

    it('does not alias fieldName that already has a dot', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.get({
            where: {
                status: { op: 'eq', fieldName: 'jr.status', value: 'ok' },
            },
            include: ['runs'],
        })

        const [sql, values] = queryMock.mock.calls[0]
        expect(sql).toContain('WHERE jr.status = $1')
        expect(values).toEqual(['ok'])
    })
})
