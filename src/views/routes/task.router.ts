import { Router } from 'express'
import {
    createTaskSchema,
    listTasksQuerySchema,
    updateTaskSchema,
} from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { ZodError } from 'zod'
import { getPaginationData } from '../../helpers/getPaginationData'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'

export const ViewTaskRouter = Router()
const service = new TaskService()

ViewTaskRouter.get('/', async (req, res) => {
    const params = listTasksQuerySchema.parse(req.query)
    const { items: tasks, total, limit, offset } = await service.paginate(params)
    const paginateData = getPaginationData({ limit, offset, total, filters: params })

    if (req.get('HX-Request') === 'true') {
        return res.render('partials/task-list-section', {
            tasks,
            filterValues: params,
            paginateData,
            layout: false,
        })
    }

    res.render('pages/task-list', {
        tasks,
        filterValues: params,
        paginateData,
    })
})

ViewTaskRouter.get('/create', (req, res) => {
    res.render('pages/task-create', { values: {}, errors: {} })
})

ViewTaskRouter.post('/create', parseFormValuesMD, async (req, res) => {
    try {
        const dto = createTaskSchema.parse(req.body)
        const task = await service.createTask(dto)

        return res.redirect(`/task`)
    } catch (err: any) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-create', {
                values: req.body,
                errors,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

ViewTaskRouter.get('/edit/:id', async (req, res) => {
    const id = Number(req.params.id)
    const task = await service.getByIdOrFail(id)

    res.render('pages/task-edit', { values: task, errors: {} })
})

ViewTaskRouter.post('/edit/:id', parseFormValuesMD, async (req, res) => {
    try {
        const id = Number(req.params.id)

        const currentTask = await service.getByIdOrFail(id)
        const candidate = { ...currentTask, ...req.body }
        const dto = createTaskSchema.parse(candidate)

        const task = await service.updateTask(id, dto)

        return res.redirect(`/task`)
    } catch (err) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-edit', {
                values: req.body,
                errors,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

ViewTaskRouter.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    await service.deleteById(id)
    return res.status(HttpStatus.OK).send('')
})
