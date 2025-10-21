import { Router } from 'express'
import { taskRouter } from './task.router'
import { jobRouter } from './job.router'

export const apiRouter = Router()

apiRouter.get('/test', (req, res) => {
    console.log('test EP hit')
    res.status(200).send('test EP hit')
})

apiRouter.use('/tasks', taskRouter)
apiRouter.use('/jobs', jobRouter)
