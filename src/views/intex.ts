import { Router } from 'express'
import { ViewTaskRouter } from './routes/task.router'
import { ViewJobRouter } from './routes/job.router'

export const viewRouter = Router()

viewRouter.get('/', (req, res) => {
    res.render('pages/index')
})
viewRouter.use('/task', ViewTaskRouter)
viewRouter.use('/job', ViewJobRouter)
