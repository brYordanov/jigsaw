import { Router } from 'express'
import { validateJobConfig } from '../../modules/jobs/job.dtos'

export const ViewJobRouter = Router()

ViewJobRouter.get('/', (req, res) => {
    res.render('pages/job-list')
})

ViewJobRouter.get('/create', (req, res) => {
    res.render('pages/job-create', { values: {}, errors: {} })
})

ViewJobRouter.post('/create', (req, res) => {
    const body = req.body
    const some = validateJobConfig(body.job_type, body.config)
    console.log(body)
    console.log('--------')
    console.log(some)

    res.send(200)
})

ViewJobRouter.get('/config-partial', (req, res) => {
    try {
        const jobType = String(req.query.job_type)
        const known = ['http', 'email', 'shell', 'sql', 'healthcheck']
        if (!known.includes(jobType)) {
            throw new Error('Unknown job type')
        }
        const partial = jobType

        return res.render(`partials/job-config-fields/${partial}.ejs`, {
            values: {},
            errors: {},
            layout: false,
        })
    } catch (err) {
        res.status(400).json({ error: (err as Error).message })
    }
})
