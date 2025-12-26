import { Pool } from 'pg'

export type Dir = 'ASC' | 'DESC'
export type FilterOp =
    | 'eq'
    | 'ilike'
    | 'in'
    | 'gte'
    | 'lte'
    | 'gt'
    | 'lt'
    | 'is'
    | 'date_gte'
    | 'date_lte'

export type FilterSpecExplicit =
    | {
          op: Exclude<FilterOp, 'is'>
          value: unknown
          fieldName?: string
      }
    | {
          op: 'is'
          value: 'null' | 'not null'
          fieldName?: string
      }

export type FilterSpec = FilterSpecExplicit | unknown
export type FilterConfig = Record<string, FilterSpec>

export interface PaginateConfig<TFilters extends Record<string, any>> {
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
