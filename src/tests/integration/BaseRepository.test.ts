import { afterAll, describe, expect, beforeEach, it } from 'vitest'
import { resetTestTables, testPool } from '../test-db'
import { IntervalType, ScheduleType, TaskRow } from '../../modules/tasks/task.entity'
import { BaseRepository } from '../../db/BaseRepository'
import type { Pool } from 'pg'

export class TestTaskRepository extends BaseRepository {
    constructor(pool: Pool) {
        super(pool, 'tasks', 'id, name, schedule_type, interval_type')
    }
}

const repo = new TestTaskRepository(testPool)

const seedTask = async (
    partial: Partial<{ name: string; schedule_type: ScheduleType; interval_type: IntervalType }>
) => {
    const name = partial?.name ?? `task_${Math.random().toString(16).slice(2)}`
    const schedule_type = partial?.schedule_type ?? 'fixed'
    const interval_type = partial?.interval_type ?? 'monthly'

    return repo.create<TaskRow>({ name, schedule_type, interval_type })
}

describe('BaseRepository (integration)', () => {
    beforeEach(async () => {
        await resetTestTables()
    })

    afterAll(async () => {
        await testPool.end()
    })

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
        const created = await seedTask({ name: 'todel' })

        await repo.deleteById(created.id)

        const rows = await repo.get<TaskRow>({ where: { id: created.id } })
        expect(rows.length).toBe(0)
    })
})
