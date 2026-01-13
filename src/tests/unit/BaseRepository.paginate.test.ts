import { describe, expect, vi, it } from 'vitest'
import { BaseRepository } from '../../db/BaseRepository'
import type { Pool } from 'pg'

class TestRepo extends BaseRepository {
    constructor(pool: Pool) {
        super(pool, 'jobs', 'id, name, created_at')
    }
}

const createTestDeps = () => {
    const queryMock = vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'a', created_at: 's' }] })
        .mockResolvedValueOnce({ rows: [{ count: 6 }] })

    const pool = { query: queryMock } as unknown as Pool
    const repo = new TestRepo(pool)

    return { queryMock, repo }
}

describe('BaseRepository.paginate', () => {
    it('uses safe sort fallback and correct LIMIT/OFFSET placeholders', async () => {
        const { queryMock, repo } = createTestDeps()

        const result = await repo.paginate({
            filterConfig: {
                name: { op: 'ilike', value: 'abc' },
            },
            sort: 'non-existent',
            dir: 'ASC',
            allowedSort: ['created_at', 'id'],
            limit: 20,
            offset: 40,
        })

        expect(result.total).toBe(6)
        expect(result.limit).toBe(20)
        expect(result.offset).toBe(40)

        expect(queryMock).toHaveBeenCalledTimes(2)

        const [listSql, listVals] = queryMock.mock.calls[0]
        expect(listSql).toContain('FROM jobs')
        expect(listSql).toContain('WHERE jobs.name ILIKE $1')
        expect(listSql).toContain('ORDER BY created_at ASC')
        expect(listSql).toContain('LIMIT $2 OFFSET $3')
        expect(listVals).toEqual(['%abc%', 20, 40])

        const [countSql, countVals] = queryMock.mock.calls[1]
        expect(countSql).toContain(
            'SELECT COUNT(*)::int AS count FROM jobs WHERE jobs.name ILIKE $1'
        )
        expect(countVals).toEqual(['%abc%'])
    })

    it('sanitizes dir to DESC when not ASC', async () => {
        const { queryMock, repo } = createTestDeps()

        await repo.paginate({
            filterConfig: {},
            sort: 'id',
            dir: 'lol' as any,
            allowedSort: ['id'],
            limit: 10,
            offset: 0,
        })

        const [listSql] = queryMock.mock.calls[0]
        expect(listSql).toContain('ORDER BY id DESC')
    })

    it('uses the correct LIMIT/OFFSET placeholders when multiple filters exist', async () => {
        const { queryMock, repo } = createTestDeps()
        await repo.paginate({
            filterConfig: {
                name: { op: 'ilike', value: 'abc' },
                attempts: { op: 'gte', value: 3 },
            },
            sort: 'id',
            dir: 'DESC',
            allowedSort: ['id'],
            limit: 5,
            offset: 10,
        })

        const [listSql, listVals] = queryMock.mock.calls[0]
        expect(listSql).toContain('WHERE jobs.name ILIKE $1 AND jobs.attempts >= $2')
        expect(listSql).toContain('LIMIT $3 OFFSET $4')
        expect(listVals).toEqual(['%abc%', 3, 5, 10])
    })
})
