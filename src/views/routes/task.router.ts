import { Router } from 'express'
import { CreateTaskBodyDto, createTaskSchema } from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { coerseFormValues } from '../../middlewares/coerseFormValues'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { ZodError } from 'zod'

export const ViewTaskRouter = Router()
const service = new TaskService()

ViewTaskRouter.get('/', (req, res) => {
    res.render('pages/task-list')
})

ViewTaskRouter.get('/create', (req, res) => {
    res.render('pages/task-create', { values: {}, errors: {} })
})

ViewTaskRouter.post('/create', coerseFormValues, async (req, res) => {
    try {
        const dto = createTaskSchema.parse(req.body)
        // const task = await service.createTask(dto)

        return res.redirect(`/`)
    } catch (err: any) {
        if (err instanceof ZodError) {
            const { firstPerField, grouped } = groupZodIssues(err.issues)
            console.log(grouped)
            console.log(req.body)

            return res
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .render('pages/task-create', { values: req.body, errors: firstPerField })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

const returnValuesToForm = (data: CreateTaskBodyDto) => {
    return
}
