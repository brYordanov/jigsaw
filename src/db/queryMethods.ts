import { Pool, QueryConfig, QueryResultRow } from 'pg'
import { PaginateConfig } from './types'

export const getById = async (
    pool: Pool,
    returningCols: string,
    table: string,
    id: number
): Promise<any> => {
    const { rows } = await pool.query(`SELECT ${returningCols} FROM ${table} WHERE id=$1`, [id])
    return rows[0]
}

export const getAll = async (pool: any, returningCols: string, table: string): Promise<any> => {
    const { rows } = await pool.query(`SELECT ${returningCols} FROM ${table}`)
    return rows[0]
}

export const create = async (
    pool: Pool,
    table: string,
    returningCols: string,
    data: Record<string, any>
): Promise<any> => {
    const cols = Object.keys(data)
    if (!cols.length) throw new Error('insertRow: no data')

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
    const values = Object.values(data)

    const q: QueryConfig = {
        text: `
            INSERT INTO ${table}(
                ${cols.join(', ')}
            )
            VALUES (${placeholders})
            RETURNING ${returningCols}
            `,
        values,
    }

    const { rows } = await pool.query(q)
    return rows[0]
}

export const update = async (
    pool: Pool,
    table: string,
    returnCols: string,
    id: number,
    data: Record<string, any>
) => {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
    if (!entries.length) {
        const { rows } = await pool.query(`SELECT ${returnCols} FROM ${table} WHERE id=$1`, [id])
        return rows
    }

    const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ')
    const values = entries.map(([_, v]) => v)
    values.push(id)

    const { rows } = await pool.query({
        text: `UPDATE ${table} SET ${sets} WHERE id=$${values.length} RETURNING ${returnCols}`,
        values,
    })

    return rows[0]
}

export const paginate = async <
    TRow extends QueryResultRow = any,
    TFilters extends Record<string, any> = any,
>(
    cfg: PaginateConfig<TFilters>
) => {
    const {
        pool,
        table,
        returnCols,
        filters,
        filterConfig,
        sort,
        dir,
        allowedSort,
        limit,
        offset,
    } = cfg

    const whereParts: string[] = []
    const values: any[] = []
    let i = 1

    for (const [key, spec] of Object.entries(filterConfig)) {
        if (!(key in filters)) continue
        const val = (filters as any)[key]
        if (val === undefined) continue

        if (typeof spec === 'object' && 'op' in spec) {
            switch (spec.op) {
                case 'ilike':
                    whereParts.push(`${key} ILIKE $${i++}`)
                    values.push(typeof val === 'string' ? `%${val}%` : val)
                    break
                case 'in':
                    whereParts.push(`${key} = ANY($${i++})`)
                    values.push(val)
                    break
                case 'gte':
                    whereParts.push(`${key} >= $${i++}`)
                    values.push(val)
                    break
                case 'lte':
                    whereParts.push(`${key} <= $${i++}`)
                    values.push(val)
                    break
                case 'gt':
                    whereParts.push(`${key} > $${i++}`)
                    values.push(val)
                    break
                case 'lt':
                    whereParts.push(`${key} < $${i++}`)
                    values.push(val)
                    break
                case 'is':
                    whereParts.push(`${key} IS ${spec.value.toUpperCase()}`)
                    break
                default:
                    whereParts.push(`${key} = $${i++}`)
                    values.push(val)
            }
        } else {
            whereParts.push(`${key} = $${i++}`)
            values.push(val)
        }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
    const safeSort = allowedSort.includes(sort) ? sort : allowedSort[0]
    const safeDir = (dir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const listSql =
        `SELECT ${returnCols} FROM ${table} ` +
        `${whereSql} ` +
        `ORDER BY ${safeSort} ${safeDir} ` +
        `LIMIT $${i++} OFFSET $${i++}`

    const listVals = [...values, limit, offset]

    const countSql = `SELECT COUNT(*)::int AS count FROM ${table} ${whereSql}`

    const [listRes, countRes] = await Promise.all([
        pool.query<TRow>(listSql, listVals),
        pool.query<{ count: number }>(countSql, values),
    ])

    return {
        items: listRes.rows,
        total: countRes.rows[0]?.count ?? 0,
        limit,
        offset,
    }
}
