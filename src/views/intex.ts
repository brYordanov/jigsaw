import { Router } from 'express'
import { ViewTaskRouter } from './routes/task.router'

export const viewRouter = Router()

viewRouter.get('/', (req, res) => {
    res.render('pages/index')
})
viewRouter.use('/task', ViewTaskRouter)
