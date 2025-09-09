import { Router } from 'express'
import { createTaskSchema, listTasksQuerySchema } from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { coerseFormValuesMD } from '../../middlewares/coerseFormValues'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { ZodError } from 'zod'
import { normalizeFormValues } from '../../middlewares/normalizeFormValues'

export const ViewTaskRouter = Router()
const service = new TaskService()

ViewTaskRouter.get('/', async (req, res) => {
    const params = listTasksQuerySchema.parse(req.query)

    const { items: tasks } = await service.paginate(params)
    if (!params.is_enabled) params.is_enabled === false

    res.render('pages/task-list', { tasks, filterValues: params })
})

ViewTaskRouter.get('/create', (req, res) => {
    res.render('pages/task-create', { values: {}, errors: {} })
})

ViewTaskRouter.post('/create', coerseFormValuesMD, async (req, res) => {
    try {
        const dto = createTaskSchema.parse(req.body)
        const task = await service.createTask(dto)

        return res.redirect(`/task`)
    } catch (err: any) {
        if (err instanceof ZodError) {
            const { firstPerField, grouped } = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-create', {
                values: normalizeFormValues(req.body),
                errors: firstPerField,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})
