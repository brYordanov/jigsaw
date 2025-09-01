import { Router } from 'express'
import { TaskService } from './task.service'
import { TaskRow } from './task.entity'

export const taskRouter = Router()
const service = new TaskService()

taskRouter.get('/', (req, res) => {
    res.send(111)
})

taskRouter.get('/:id', async (req, res) => {
    res.send(await service.getByIdOrFail(Number(req.params)))
})

taskRouter.post('/', async (req, res) => {
    res.send(await service.createTask(req.body))
})

taskRouter.patch('/:id', async (req, res) => {
    res.send(await service.updateTask(Number(req.params), req.body))
})
