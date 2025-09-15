import { Router } from 'express'
import { taskRouter } from '../modules/tasks/task.router'

export const apiRouter = Router()

apiRouter.use('/tasks', taskRouter)
