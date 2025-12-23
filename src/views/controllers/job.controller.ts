import { Response, Router } from 'express'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import {
    JobTypeSchema,
    ListJobsQueryDto,
    listJobsQuerySchema,
} from '../../modules/jobs/dtos/module.dtos'
import { JobService } from '../../modules/jobs/job.service'
import { ZodError } from 'zod'
import { HttpStatus } from '../../helpers/statusCodes'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { getPaginationData } from '../../helpers/getPaginationData'
import { createJobBodySchema } from '../../modules/jobs/dtos/create-job.dto'
import { updateJobBodySchema } from '../../modules/jobs/dtos/update-job.dto'
import { validate, vParams, vQuery } from '../../middlewares/validate'
import { asyncHandler } from '../../helpers/asyncHandler'
import { idParamDto, idParamSchema } from '../../commonSchemas'
import { RunnerService } from '../../modules/execution/runner.service'

export function createJobController(service: JobService, runnerService: RunnerService) {
    const JobController = Router()

    JobController.get(
        '/',
        validate(listJobsQuerySchema, 'query'),
        asyncHandler(async (req, res) => {
            const query = vQuery<ListJobsQueryDto>(req)
            const { items: jobs, total, limit, offset } = await service.paginate(query)
            const paginateData = getPaginationData({ limit, offset, total, filters: query })

            if (req.get('HX-Request') === 'true') {
                return res.render('partials/job-list-section', {
                    jobs,
                    filterValues: query,
                    paginateData,
                    module: 'job',
                    layout: false,
                })
            }

            res.render('pages/job-list', {
                jobs,
                filterValues: query,
                paginateData,
                module: 'job',
            })
        })
    )

    JobController.get('/create', (req, res) => {
        res.render('pages/job-create', { values: {}, errors: {}, configPartialHtml: '' })
    })

    JobController.post(
        '/create',
        parseFormValuesMD,
        asyncHandler(async (req, res) => {
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
                throw err
            }
        })
    )

    JobController.get(
        '/edit/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            const job = await service.getByIdOrFail(id)
            let configPartialHtml = ''

            if (job.job_type) {
                job.config.variables = JSON.stringify(job.config.variables)
                configPartialHtml = await renderConfigPartial(res, job.job_type, job.config)
            }

            res.render('pages/job-edit', { values: job, errors: {}, configPartialHtml })
        })
    )

    JobController.post(
        '/edit/:id',
        parseFormValuesMD,
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            try {
                const { id } = vParams<idParamDto>(req)
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
    )

    JobController.delete(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            await service.deleteById(id)
            return res.status(HttpStatus.OK).send('')
        })
    )

    JobController.get('/config-partial', (req, res) => {
        try {
            const jobType = JobTypeSchema.safeParse(req.query.job_type)
            if (jobType.error) {
                throw new Error('Unknown job type')
            }

            return res.render(`partials/job-config-fields/${jobType.data}.ejs`, {
                values: {},
                errors: {},
                layout: false,
            })
        } catch (err) {
            res.status(400).json({ error: (err as Error).message })
        }
    })

    JobController.post(
        '/:id/execute',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id: jobId } = vParams<idParamDto>(req)
            const result = await runnerService.executeJobById(jobId)
            res.send(result)
        })
    )

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

    return JobController
}
