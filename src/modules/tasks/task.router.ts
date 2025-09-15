import { Router } from 'express'
import { TaskService } from './task.service'
import { listTasksQuerySchema } from './task.dtos'

export const taskRouter = Router()
const service = new TaskService()

taskRouter.get('/', async (req, res) => {
    res.send(await service.getAll())
})

taskRouter.get('/paginate', async (req, res) => {
    const parsed = listTasksQuerySchema.safeParse(req.query)
    if (!parsed.success) {
        res.send('param validation error')
        return
    }
    res.send(await service.paginate(parsed.data))
})

taskRouter.get('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.getByIdOrFail(Number(id)))
})

taskRouter.post('/', async (req, res) => {
    res.send(await service.createTask(req.body))
})

taskRouter.patch('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.updateTask(Number(id), req.body))
})

taskRouter.delete('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.deleteById(Number(id)))
})
