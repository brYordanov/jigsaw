import { Router } from 'express'

export const apiRouter = Router()

apiRouter.get('/', (req, res) => {
  res.json({ status: 'API is running' })
})
