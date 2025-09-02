import { TaskRow } from './task.entity'

export interface PaginatedResponse {
    items: TaskRow[]
    total: number
    limit: number
    offset: number
}
