import { Router } from 'express'

export const taskRouter = Router()

taskRouter.get('/', (req, res) => {
    res.send(111)
})
