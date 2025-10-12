import { PaginatedResponse } from '../../db/types'
import { CreateTaskBodyDto, ListTasksQueryDto, UpdateTaskBodyDto } from './task.dtos'
import { TaskRow } from './task.entity'
import { TaskRepository } from './task.repo'

export class TaskService {
    constructor(private readonly repo = new TaskRepository()) {}

    async getAll(): Promise<TaskRow[]> {
        return this.repo.getAll()
    }

    async getByIdOrFail(id: number, include?: string[]): Promise<TaskRow> {
        const task = this.repo.getById(id, include)
        if (!task) throw new Error('Task not found')

        return task
    }

    async getTaskWithJobs(taskId: number): Promise<TaskRow> {
        return this.getByIdOrFail(taskId, ['jobs'])
    }

    async paginate(params: ListTasksQueryDto): Promise<PaginatedResponse<TaskRow>> {
        return this.repo.listPaginated(params)
    }

    async createTask(body: CreateTaskBodyDto): Promise<TaskRow> {
        return this.repo.createTask(body)
    }

    async updateTask(id: number, body: UpdateTaskBodyDto) {
        return this.repo.updateTask(id, body)
    }

    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id)
    }
}
