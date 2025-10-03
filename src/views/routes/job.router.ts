import { Response, Router } from 'express'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import { createJobBodySchema } from '../../modules/jobs/job.dtos'
import { JobService } from '../../modules/jobs/job.service'
import { ZodError } from 'zod'
import { HttpStatus } from '../../helpers/statusCodes'
import { groupZodIssues } from '../../helpers/groupZodIssues'

export const ViewJobRouter = Router()
const service = new JobService()

ViewJobRouter.get('/', (req, res) => {
    res.render('pages/job-list')
})

ViewJobRouter.get('/create', (req, res) => {
    res.render('pages/job-create', { values: {}, errors: {}, configPartialHtml: '' })
})

ViewJobRouter.post('/create', parseFormValuesMD, async (req, res) => {
    try {
        const dto = createJobBodySchema.parse(req.body)
        const job = await service.createJob(dto)
        return res.redirect('/job')
    } catch (err: any) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)
            const jobType = String(req.body.job_type ?? '')
            let configPartialHtml = ''

            if (jobType) {
                configPartialHtml = await renderConfigPartial(
                    res,
                    jobType,
                    req.body.config ?? {},
                    errors.config ?? {}
                )
            }

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/job-create', {
                values: req.body,
                errors,
                configPartialHtml,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

ViewJobRouter.get('/config-partial', (req, res) => {
    try {
        const jobType = String(req.query.job_type)
        const known = ['http', 'email', 'shell', 'sql', 'healthcheck']
        if (!known.includes(jobType)) {
            throw new Error('Unknown job type')
        }

        return res.render(`partials/job-config-fields/${jobType}.ejs`, {
            values: {},
            errors: {},
            layout: false,
        })
    } catch (err) {
        res.status(400).json({ error: (err as Error).message })
    }
})

function renderConfigPartial(
    res: Response,
    jobType: string,
    values: any = {},
    errors: any = {}
): Promise<string> {
    return new Promise((resolve, reject) => {
        const partialPath = `partials/job-config-fields/${jobType}.ejs`
        res.render(partialPath, { values, errors, layout: false }, (err, html) =>
            err ? reject(err) : resolve(html!)
        )
    })
}
