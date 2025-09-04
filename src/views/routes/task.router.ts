import { Router } from 'express'

export const ViewTaskRouter = Router()

ViewTaskRouter.get('/', (req, res) => {
    res.render('pages/task-list')
})

ViewTaskRouter.get('/create', (req, res) => {
    res.render('pages/create-task')
})
