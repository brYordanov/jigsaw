import { Router } from 'express'
import { taskRouter } from './task.router'
import { jobRouter } from './job.router'

export const apiRouter = Router()

apiRouter.use('/tasks', taskRouter)
apiRouter.use('/jobs', jobRouter)
