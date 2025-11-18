import { Router } from 'express'
import { TaskController } from './controllers/task.controller'
import { JobController } from './controllers/job.controller'

export const viewRouter = Router()

viewRouter.get('/', (req, res) => {
    res.render('pages/index')
})
viewRouter.use('/task', TaskController)
viewRouter.use('/job', JobController)
