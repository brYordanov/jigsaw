import { Pool } from 'pg'

export type Dir = 'ASC' | 'DESC'
export type FilterSpec =
    | 'eq'
    | { op: 'eq' }
    | { op: 'ilike' }
    | { op: 'in' }
    | { op: 'gte' }
    | { op: 'lte' }
    | { op: 'gt' }
    | { op: 'lt' }
    | { op: 'is'; value: 'null' | 'not null' }

export type FilterConfig = Record<string, FilterSpec>

export interface PaginateConfig<TFilters extends Record<string, any>> {
    filters: TFilters
    filterConfig: FilterConfig
    sort: string
    dir: Dir
    allowedSort: readonly string[]
    limit: number
    offset: number
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    limit: number
    offset: number
}

export type RelationSpec = {
    /** SQL to JOIN an aggregated subquery returning one row per base id */
    join: string
    /** Columns the relation adds to SELECT (e.g., r_jobs.jobs AS "jobs") */
    select: string
}

export type TxOptions = {
    isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'
    isReadonly?: boolean
    isDeferrable?: boolean
    maxRetries?: number
}
