import { Router } from 'express'
import { taskRouter } from './task.router'
import { jobRouter } from './job.router'
import { runRouter } from './run.router'

export const apiRouter = Router()
// let count = 0
apiRouter.get('/test', (req, res) => {
    // count++
    // if (count < 5) throw new Error('random err')
    res.status(200).send('test EP hit')
})

apiRouter.use('/tasks', taskRouter)
apiRouter.use('/jobs', jobRouter)
apiRouter.use('/run', runRouter)
