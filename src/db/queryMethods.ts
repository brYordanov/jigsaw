import { Pool, QueryConfig } from 'pg'

export const getById = async (
    pool: any,
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
    pool: any,
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
    pool: any,
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

type Dir = 'ASC' | 'DESC'

type FilterSpec =
    | 'eq'
    | { op: 'eq' }
    | { op: 'ilike' }
    | { op: 'in' }
    | { op: 'gte' }
    | { op: 'lte' }
    | { op: 'gt' }
    | { op: 'lt' }
    | { op: 'is'; value: 'null' | 'not null' }

type FilterConfig = Record<string, FilterSpec>

interface PagianteConfig<TFilters extends Record<string, any>> {
    pool: Pool
    table: string
    returnCols: readonly string[]
    filters: TFilters
    filterConfig: FilterConfig
    sort: string
    dir: Dir
    allowedSort: readonly string[]
    limit: number
    offset: number
}

export const paginate = async (
    pool: any,
    table: string,
    returnCols: string,
    params: Record<string, any>
) => {
    const where: string[] = []
    const vals: any[] = []
    let i = 1

    Object.keys(params).map(key => {
        where.push(`${key} = $${i++}`)
        vals.push(params[key])
    })

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sort = params.sort

    const listSql = `
            SELECT ${returnCols}
            FROM ${table}
            ${whereSql}
            ORDER BY ${sort} ${params.dir}
            LIMIT $${i++} OFFSET $${i++}
        `

    const listVals = [...vals, params.limit, params.offset]

    const countSql = `
            SELECT COUNT(*)::int AS count FROM ${table} ${whereSql}
        `

    const [rowRes, countRes] = await Promise.all([
        pool.query(listSql, listVals),
        pool.query(countSql, vals),
    ])

    return {
        items: rowRes.rows,
        total: countRes.rows[0].count,
        limit: params.limit,
        offset: params.offset,
    }
}
