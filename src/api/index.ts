import { Router } from 'express'
import { taskRouter } from './task.router'

export const apiRouter = Router()

apiRouter.use('/tasks', taskRouter)
