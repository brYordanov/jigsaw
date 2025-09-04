import { Router } from 'express'
import { ViewTaskRouter } from './routes/task.router'

export const viewRouter = Router()

viewRouter.use('/tasks', ViewTaskRouter)
