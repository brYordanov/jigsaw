import { Router } from 'express'
import { validateJobConfig, validatorsByType } from '../../modules/jobs/job.dtos'

export const ViewJobRouter = Router()

ViewJobRouter.get('/', (req, res) => {
    res.render('pages/job-list')
})

ViewJobRouter.get('/create', (req, res) => {
    res.render('pages/job-create', { values: {}, errors: {} })
})

ViewJobRouter.post('/create', (req, res) => {
    const body = req.body
    validateJobConfig(validatorsByType[body.job_type], body.config)
    console.log(body)
})
