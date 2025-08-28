import { Router } from 'express'

export const viewRouter = Router()

viewRouter.get('/', (req, res) => {
  res.render('pages/index', { title: 'Home' })
})

viewRouter.get('/create', (req, res) => {
  res.render('pages/create-form', {})
})
