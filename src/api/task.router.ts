import { Router } from 'express'
import { TaskService } from '../modules/tasks/task.service'
import {
    CreateTaskBodyDto,
    createTaskSchema,
    ListTasksQueryDto,
    listTasksQuerySchema,
} from '../modules/tasks/task.dtos'
import { asyncHandler } from '../helpers/asyncHandler'
import { validate, vBody, vParams, vQuery } from '../middlewares/validate'
import { idParamDto, idParamSchema } from '../commonSchemas'

export function createTaskRouter(service: TaskService) {
    const taskRouter = Router()

    taskRouter.get(
        '/',
        asyncHandler(async (req, res) => {
            res.send(await service.getAll())
        })
    )

    taskRouter.get(
        '/paginate',
        validate(listTasksQuerySchema, 'query'),
        asyncHandler(async (req, res) => {
            const data = vQuery<ListTasksQueryDto>(req)
            res.send(await service.paginate(data))
        })
    )

    taskRouter.get(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            res.send(await service.getByIdOrFail(id))
        })
    )

    taskRouter.post(
        '/',
        validate(createTaskSchema, 'body'),
        asyncHandler(async (req, res) => {
            const data = vBody<CreateTaskBodyDto>(req)
            res.send(await service.createTask(data))
        })
    )

    taskRouter.patch(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            res.send(await service.updateTask(id, req.body))
        })
    )

    taskRouter.delete(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            res.send(await service.deleteById(id))
        })
    )

    return taskRouter
}
