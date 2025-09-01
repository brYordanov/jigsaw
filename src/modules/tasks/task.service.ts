import { CreateTaskBody, UpdateTaskBody } from './task.dtos'
import { TaskRow } from './task.entity'
import { TaskRepository } from './task.repo'

export class TaskService {
    constructor(private readonly repo = new TaskRepository()) {}

    async getByIdOrFail(id: number): Promise<TaskRow> {
        const task = this.repo.getById(id)
        if (!task) throw new Error('Task not found')

        return task
    }

    async createTask(body: CreateTaskBody): Promise<TaskRow> {
        return this.repo.createTask(body)
    }

    async updateTask(id: number, body: UpdateTaskBody) {
        return this.repo.updateTask(id, body)
    }
}
