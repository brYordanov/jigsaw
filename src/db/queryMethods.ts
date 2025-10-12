import { Pool, QueryConfig, QueryResultRow } from 'pg'
import { PaginateConfig, RelationSpec } from './types'

export class RepoMethods {
    constructor(
        private readonly pool: Pool,
        private readonly tableName: string,
        private readonly returningCols: string,
        private readonly relations: Record<string, RelationSpec> = {}
    ) {}

    async get<T extends QueryResultRow = any>(
        config: {
            where?: Record<string, any>
            orderBy?: string
            dir?: 'ASC' | 'DESC'
            include?: string[]
            limit?: number
        } = {}
    ): Promise<T[]> {
        const { where, orderBy, dir, include, limit } = config
        const { whereParts, values } = this.getWhereElements(where)

        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
        const orderSql = orderBy
            ? `ORDER BY baseTable.${orderBy} ${(dir || 'ASC').toUpperCase()}`
            : ''
        const limitSql = limit ? `LIMIT ${Number(limit)}` : ''

        const useIncludes = Boolean(include?.length)
        const sql = useIncludes
            ? this.createIncludeSql(include!, whereSql, orderSql, limitSql)
            : `SELECT ${this.returningCols} FROM ${this.tableName} AS baseTable ${whereSql} ${orderSql} ${limitSql}`

        const { rows } = await this.pool.query<T>(sql, values)

        return rows
    }

    async getOne<T extends QueryResultRow = any>(
        config: Omit<Parameters<this['get']>[0], 'limit'>
    ): Promise<T | null> {
        const rows = await this.get<T>({ ...config, limit: 1 })
        return rows[0] ?? null
    }

    async getAll(): Promise<any> {
        const { rows } = await this.pool.query(`SELECT * FROM ${this.tableName}`)
        return rows
    }

    async create(data: Record<string, any>, client?: import('pg').PoolClient): Promise<any> {
        const cols = Object.keys(data)
        if (!cols.length) throw new Error('insertRow: no data')

        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
        const values = Object.values(data)

        const q: QueryConfig = {
            text: `
            INSERT INTO ${this.tableName}(
                ${cols.join(', ')}
            )
            VALUES (${placeholders})
            RETURNING ${this.returningCols}
            `,
            values,
        }

        const runner = client ?? this.pool
        const { rows } = await runner.query(q)
        return rows[0]
    }

    async update(id: number, data: Record<string, any>, client?: import('pg').PoolClient) {
        const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
        if (!entries.length) {
            const { rows } = await this.pool.query(
                `SELECT ${this.returningCols} FROM ${this.tableName} WHERE id=$1`,
                [id]
            )
            return rows
        }

        const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ')
        const values = entries.map(([_, v]) => v)
        values.push(id)

        const runner = client ?? this.pool
        const { rows } = await runner.query({
            text: `UPDATE ${this.tableName} SET ${sets} WHERE id=$${values.length} RETURNING ${this.returningCols}`,
            values,
        })

        return rows[0]
    }

    async paginate<TRow extends QueryResultRow = any, TFilters extends Record<string, any> = any>(
        cfg: PaginateConfig<TFilters>
    ) {
        const { filters, filterConfig, sort, dir, allowedSort, limit, offset } = cfg

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
            `SELECT ${this.returningCols} FROM ${this.tableName} ` +
            `${whereSql} ` +
            `ORDER BY ${safeSort} ${safeDir} ` +
            `LIMIT $${i++} OFFSET $${i++}`

        const listVals = [...values, limit, offset]

        const countSql = `SELECT COUNT(*)::int AS count FROM ${this.tableName} ${whereSql}`

        const [listRes, countRes] = await Promise.all([
            this.pool.query<TRow>(listSql, listVals),
            this.pool.query<{ count: number }>(countSql, values),
        ])

        return {
            items: listRes.rows,
            total: countRes.rows[0]?.count ?? 0,
            limit,
            offset,
        }
    }

    async deleteById(id: number): Promise<void> {
        await this.pool.query('DELETE FROM ${this.tableName} WHERE id=$1', [id])
    }

    private getWhereElements(whereConfig?: Record<string, any>) {
        const whereParts: string[] = []
        const values: any[] = []
        let i = 1
        if (whereConfig) {
            for (const [key, val] of Object.entries(whereConfig)) {
                const col = `baseTable.${key}`
                if (Array.isArray(val)) {
                    whereParts.push(`${col} = ANY($${i++})`)
                    values.push(val)
                } else if (val === null) {
                    whereParts.push(`${col} IS NULL`)
                } else {
                    whereParts.push(`${col} = $${i++}`)
                    values.push(val)
                }
            }
        }

        return { whereParts, values }
    }

    private createIncludeSql(
        include: string[],
        whereSql: string,
        orderSql: string,
        limitSql: string
    ) {
        const unique = Array.from(new Set(include))
        const specs = unique.map(key => {
            const spec = this.relations[key]
            if (!spec) throw new Error(`Unknown include: ${key}`)
            return spec
        })

        const relationSelects = specs
            .map(s => s.select?.trim())
            .filter(Boolean)
            .join(', ')
        const selectCols = relationSelects
            ? `${this.returningCols}, ${relationSelects}`
            : this.returningCols

        const relationJoins = specs
            .map(s => s.join?.trim())
            .filter(Boolean)
            .join('\n')

        return [
            `SELECT ${selectCols}`,
            `FROM ${this.tableName} AS baseTable`,
            relationJoins,
            whereSql,
            orderSql,
            limitSql,
        ]
            .filter(Boolean)
            .join('\n')
    }
}
