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
    pool: Pool
    table: string
    returnCols: string
    filters: TFilters
    filterConfig: FilterConfig
    sort: string
    dir: Dir
    allowedSort: readonly string[]
    limit: number
    offset: number
}
