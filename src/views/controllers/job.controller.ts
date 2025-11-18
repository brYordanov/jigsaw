import { Response, Router } from 'express'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import { listJobsQuerySchema } from '../../modules/jobs/job.dtos'
import { JobService } from '../../modules/jobs/job.service'
import { ZodError } from 'zod'
import { HttpStatus } from '../../helpers/statusCodes'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { getPaginationData } from '../../helpers/getPaginationData'
import { RunnerService } from '../../execution/runner.service'
import { createJobBodySchema } from '../../modules/jobs/dtos/create-job.dto'
import { updateJobBodySchema } from '../../modules/jobs/dtos/update-job.dto'

export const JobController = Router()
const service = new JobService()
const runnerService = new RunnerService()

JobController.get('/', async (req, res) => {
    const params = listJobsQuerySchema.parse(req.query)
    const { items: jobs, total, limit, offset } = await service.paginate(params)
    const paginateData = getPaginationData({ limit, offset, total, filters: params })

    if (req.get('HX-Request') === 'true') {
        return res.render('partials/job-list-section', {
            jobs,
            filterValues: params,
            paginateData,
            module: 'job',
            layout: false,
        })
    }

    res.render('pages/job-list', {
        jobs,
        filterValues: params,
        paginateData,
        module: 'job',
    })
})

JobController.get('/create', (req, res) => {
    res.render('pages/job-create', { values: {}, errors: {}, configPartialHtml: '' })
})

JobController.post('/create', parseFormValuesMD, async (req, res) => {
    try {
        const dto = createJobBodySchema.parse(req.body)
        await service.createJob(dto)
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

JobController.get('/edit/:id', async (req, res) => {
    const { id } = req.params
    const job = await service.getByIdOrFail(id)
    let configPartialHtml = ''

    if (job.job_type) {
        job.config.variables = JSON.stringify(job.config.variables)
        configPartialHtml = await renderConfigPartial(res, job.job_type, job.config)
    }

    res.render('pages/job-edit', { values: job, errors: {}, configPartialHtml })
})

JobController.post('/edit/:id', parseFormValuesMD, async (req, res) => {
    try {
        const { id } = req.params
        const dto = updateJobBodySchema.parse(req.body)
        await service.updateJob(id, dto)

        return res.redirect(`/job`)
    } catch (err) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/job-edit', {
                values: req.body,
                errors,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

JobController.delete('/:id', async (req, res) => {
    const { id } = req.params
    await service.deleteById(id)
    return res.status(HttpStatus.OK).send('')
})

JobController.get('/config-partial', (req, res) => {
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

JobController.post('/:id/execute', async (req, res) => {
    const { id: jobId } = req.params
    const result = await runnerService.executeJobById(jobId)
    res.send(result)
})

const renderConfigPartial = async (
    res: Response,
    jobType: string,
    values: any = {},
    errors: any = {}
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const partialPath = `partials/job-config-fields/${jobType}.ejs`
        res.render(partialPath, { values, errors, layout: false }, (err, html) =>
            err ? reject(err) : resolve(html!)
        )
    })
}
