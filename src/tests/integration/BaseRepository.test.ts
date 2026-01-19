import { afterAll, describe, expect, beforeEach, it, beforeAll } from 'vitest'
import { createTestPool, resetTestTables } from '../test-db'
import { IntervalType, ScheduleType, TaskRow } from '../../modules/tasks/task.entity'
import { BaseRepository } from '../../db/BaseRepository'
import type { Pool } from 'pg'
import { validate } from '../../middlewares/validate'

export class TestTaskRepository extends BaseRepository {
    constructor(pool: Pool) {
        super(pool, 'tasks', 'id, name, schedule_type, interval_type')
    }
}

let pool: Pool
let repo: TestTaskRepository

beforeAll(() => {
    pool = createTestPool()
    repo = new TestTaskRepository(pool)
})

beforeEach(() => resetTestTables(pool))

afterAll(() => pool.end())

const seedTask = async (
    partial: Partial<{ name: string; schedule_type: ScheduleType; interval_type: IntervalType }>
) => {
    const name = partial?.name ?? `task_${Math.random().toString(16).slice(2)}`
    const schedule_type = partial?.schedule_type ?? 'fixed'
    const interval_type = partial?.interval_type ?? 'monthly'

    return repo.create<TaskRow>({ name, schedule_type, interval_type })
}

describe('BaseRepository (integration) create, get, getOne, paginate, update, delete', () => {
    it('create() inserts and returns row', async () => {
        const created = await repo.create<TaskRow>({
            name: 'first',
            schedule_type: 'fixed',
            interval_type: 'monthly',
        })

        expect(created.id).toBeTypeOf('string')
        expect(created.schedule_type).toBe('fixed')
        expect(created.interval_type).toBe('monthly')
    })

    it('get() returns rows, supports orederBy/dir/limit', async () => {
        await seedTask({ name: 'a' })
        await seedTask({ name: 'b' })
        await seedTask({ name: 'c' })

        const rowsAsc = await repo.get<TaskRow>({ orderBy: 'id', dir: 'ASC' })
        expect(rowsAsc.length).toBe(3)
        expect(rowsAsc.map(r => r.name)).toEqual(['a', 'b', 'c'])

        const rowDescLimit2 = await repo.get<TaskRow>({ orderBy: 'id', dir: 'DESC', limit: 2 })
        expect(rowDescLimit2.length).toBe(2)
        expect(rowDescLimit2[0].name).toBe('c')
        expect(rowDescLimit2[1].name).toBe('b')
    })

    it('getOne() returns first row or null', async () => {
        const nothing = await repo.getOne<TaskRow>({ where: { name: 'awesome' } })
        expect(nothing).toBeNull()

        await seedTask({ name: 'awesome' })

        const something = await repo.getOne<TaskRow>({ where: { name: 'awesome' } })
        expect(something?.name).toBe('awesome')
    })

    it('update() updates provided fields and returns updated row', async () => {
        const created = await seedTask({ name: 'before', interval_type: 'weekly' })

        const updated = await repo.update<TaskRow>(created.id, {
            name: 'after',
            interval_type: 'daily',
        })
        expect(updated.id).toBe(created.id)
        expect(updated.name).toBe('after')
        expect(updated.interval_type).toBe('daily')
    })

    it('update() with only undefined fields returns current row (no-op update path)', async () => {
        const created = await seedTask({ name: 'same', interval_type: 'weekly' })

        const result = await repo.update<TaskRow>(created.id, {
            name: undefined,
            interval_type: undefined,
        })
        expect(result.id).toBe(created.id)
        expect(result.name).toBe('same')
        expect(result.interval_type).toBe('weekly')
    })

    it('paginate() returns items + total; uses safeSort when sort is not allowed', async () => {
        await seedTask({ name: 't1', interval_type: 'weekly' })
        await seedTask({ name: 't2', interval_type: 'daily' })
        await seedTask({ name: 't3', interval_type: 'daily' })

        const page1 = await repo.paginate<TaskRow>({
            filterConfig: { interval_type: { op: 'eq', value: 'daily' } },
            sort: 'non-existant',
            dir: 'ASC',
            allowedSort: ['id', 'name', 'created_at'],
            limit: 1,
            offset: 0,
        })

        expect(page1.total).toBe(2)
        expect(page1.items.length).toBe(1)

        const page2 = await repo.paginate<TaskRow>({
            filterConfig: { interval_type: { op: 'eq', value: 'daily' } },
            sort: 'id',
            dir: 'ASC',
            allowedSort: ['id', 'name', 'created_at'],
            limit: 1,
            offset: 1,
        })

        expect(page2.total).toBe(2)
        expect(page2.items.length).toBe(1)
        expect(page2.items[0].id).not.toBe(page1.items[0].id)
    })

    it('deleteById() deletes the row', async () => {
        const created = await seedTask({ name: 'for-deletion' })

        await repo.deleteById(created.id)

        const rows = await repo.get<TaskRow>({ where: { id: created.id } })
        expect(rows.length).toBe(0)
    })
})

describe('BaseRepository (integration) transaction, withSavePoint', () => {
    it('transaction() commits on success', async () => {
        const out = await repo.transaction(async client => {
            const innerRepo = new TestTaskRepository(client as any)
            const created = await innerRepo.create<TaskRow>({
                name: 'tx_ok',
                schedule_type: 'fixed',
                interval_type: 'weekly',
            })

            return created
        })

        const found = await repo.getOne<TaskRow>({ where: { id: out.id } })
        expect(found?.name).toBe('tx_ok')
    })

    it('transaction() rolls back on error', async () => {
        await expect(
            repo.transaction(async client => {
                const innerRepo = new TestTaskRepository(client as any)
                const created = await innerRepo.create<TaskRow>({
                    name: 'tx_fail',
                    schedule_type: 'fixed',
                    interval_type: 'weekly',
                })
                throw new Error('innevitable')
            })
        ).rejects.toThrow('innevitable')

        const found = await repo.getOne<TaskRow>({ where: { name: 'tx_fail' } })
        expect(found).toBeNull()
    })

    it(' withSavepoint() rolls back to savepoint but keeps outer transaction alive', async () => {
        await repo.transaction(async client => {
            const innerRepo = new TestTaskRepository(client as any)

            await innerRepo.create<TaskRow>(
                {
                    name: 'outer_ok_1',
                    schedule_type: 'fixed',
                    interval_type: 'weekly',
                },
                client
            )

            await expect(
                innerRepo.withSavepoint(client, async spClient => {
                    await innerRepo.create<TaskRow>(
                        {
                            name: 'sp_fail',
                            schedule_type: 'fixed',
                            interval_type: 'weekly',
                        },
                        spClient
                    )

                    throw new Error('innevitable sp err')
                })
            ).rejects.toThrow('innevitable sp err')

            await innerRepo.create<TaskRow>(
                {
                    name: 'outer_ok_2',
                    schedule_type: 'fixed',
                    interval_type: 'weekly',
                },
                client
            )
        })

        const spTask = await repo.getOne<TaskRow>({ where: { name: 'sp_fail' } })
        expect(spTask).toBeNull()

        const outerTask1 = await repo.getOne<TaskRow>({ where: { name: 'outer_ok_1' } })
        const outerTask2 = await repo.getOne<TaskRow>({ where: { name: 'outer_ok_2' } })

        expect(outerTask1).not.toBeNull()
        expect(outerTask2).not.toBeNull()
    })
})

describe('BaseRepository (integration) get() where ops', () => {
    it('eq', async () => {
        await seedTask({ name: 'a', interval_type: 'daily' })
        await seedTask({ name: 'b' })

        const rows = await repo.get({ where: { interval_type: 'daily' } })
        expect(rows.map(r => r.name)).toEqual(['a'])
    })

    it('ilike', async () => {
        await seedTask({ name: 'storm school' })
        await seedTask({ name: 'fire school' })
        await seedTask({ name: 'public library' })

        const rows = await repo.get({
            where: { name: { op: 'ilike', value: 'school' } },
            orderBy: 'id',
            dir: 'ASC',
        })

        expect(rows.map(r => r.name.toLowerCase())).toEqual(['storm school', 'fire school'])
    })

    it('in', async () => {
        await seedTask({ name: 'a', interval_type: 'daily' })
        await seedTask({ name: 'b', interval_type: 'hourly' })
        await seedTask({ name: 'a', interval_type: 'weekly' })

        const rows = await repo.get({
            where: { interval_type: { op: 'in', value: ['daily', 'hourly'] } },
            orderBy: 'id',
            dir: 'ASC',
        })

        expect(rows.map(r => r.name)).toEqual(['a', 'b'])
    })

    it('gte/lte', async () => {
        const t1 = await seedTask({ name: 'a' })
        const t2 = await seedTask({ name: 'b' })
        const t3 = await seedTask({ name: 'c' })

        const gte2 = await repo.get({
            where: { id: { op: 'gte', value: t2.id } },
            orderBy: 'id',
            dir: 'ASC',
        })
        expect(gte2.map(r => r.id)).toEqual([t2.id, t3.id])

        const lte2 = await repo.get({
            where: { id: { op: 'lte', value: t2.id } },
            orderBy: 'id',
            dir: 'ASC',
        })
        expect(lte2.map(r => r.id)).toEqual([t1.id, t2.id])
    })
})
