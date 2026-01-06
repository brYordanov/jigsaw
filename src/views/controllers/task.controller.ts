import { Router } from 'express'
import {
    createTaskSchema,
    ListTasksQueryDto,
    listTasksQuerySchema,
} from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import z, { ZodError } from 'zod'
import { getPaginationData } from '../../helpers/getPaginationData'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import { JobService } from '../../modules/jobs/job.service'
import { validate, vBody, vParams, vQuery } from '../../middlewares/validate'
import { asyncHandler } from '../../helpers/asyncHandler'
import { idParamDto, idParamSchema } from '../../commonSchemas'
import { RunnerService } from '../../modules/execution/runner.service'

export function createTaskController(
    service: TaskService,
    jobService: JobService,
    runnerService: RunnerService
) {
    const TaskController = Router()

    TaskController.get(
        '/',
        validate(listTasksQuerySchema, 'query'),
        asyncHandler(async (req, res) => {
            const params = vQuery<ListTasksQueryDto>(req)
            const { items: tasks, total, limit, offset } = await service.paginate(params)
            const paginateData = getPaginationData({ limit, offset, total, filters: params })

            if (req.get('HX-Request') === 'true') {
                return res.render('partials/task-list-section', {
                    tasks,
                    filterValues: params,
                    paginateData,
                    module: 'task',
                    layout: false,
                })
            }

            res.render('pages/task-list', {
                tasks,
                filterValues: params,
                paginateData,
                module: 'task',
            })
        })
    )

    TaskController.get(
        '/create',
        asyncHandler(async (_req, res) => {
            const availableJobs = await jobService.getAll()
            res.render('pages/task-create', {
                values: {},
                errors: {},
                availableJobs,
                existingSelectedJobs: [],
            })
        })
    )

    TaskController.post(
        '/create',
        parseFormValuesMD,
        asyncHandler(async (req, res) => {
            try {
                const dto = createTaskSchema.parse(req.body)
                await service.createTask(dto)

                return res.redirect(`/task`)
            } catch (err: any) {
                if (err instanceof ZodError) {
                    const errors = groupZodIssues(err.issues)
                    const allJobs = await jobService.getAll()

                    const selectedIds = jobsIdsFromBody(req.body)
                    const existingSelectedJobs = await jobService.getManyJobsById(selectedIds)
                    const foundIds = new Set(existingSelectedJobs.map(j => j.id))
                    const missingIds = selectedIds.filter(id => !foundIds.has(id))
                    const availableJobs = allJobs.filter(job => !foundIds.has(job.id))
                    const hasMissing = missingIds.length > 0

                    return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-create', {
                        values: req.body,
                        errors,
                        availableJobs,
                        existingSelectedJobs,
                        warningMissingJobs: hasMissing
                            ? `Follwing ids dont exist (IDs: ${missingIds.join(', ')})`
                            : null,
                    })
                }

                console.error(err)
                throw err
            }
        })
    )

    TaskController.get(
        '/edit/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            const task = await service.getByIdOrFail(id, ['jobs'])
            const allJobs = await jobService.getAll()
            const existingSelectedJobs = task.jobs
            const availableJobs = allJobs.filter(
                job => !existingSelectedJobs?.find(assignedJob => assignedJob.id === job.id)
            )

            res.render('pages/task-edit', {
                values: task,
                errors: {},
                availableJobs,
                existingSelectedJobs,
            })
        })
    )

    TaskController.post(
        '/edit/:id',
        parseFormValuesMD,
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            try {
                const { id } = vParams<idParamDto>(req)

                const currentTask = await service.getByIdOrFail(id)
                const candidate = { ...currentTask, ...req.body }
                const dto = createTaskSchema.parse(candidate)

                await service.updateTask(id, dto)

                return res.redirect(`/task`)
            } catch (err) {
                if (err instanceof ZodError) {
                    const errors = groupZodIssues(err.issues)
                    const allJobs = await jobService.getAll()
                    const selectedIds = jobsIdsFromBody(req.body)
                    const existingSelectedJobs = await jobService.getManyJobsById(selectedIds)
                    const foundIds = new Set(existingSelectedJobs.map(j => j.id))
                    const missingIds = selectedIds.filter(id => !foundIds.has(id))
                    const availableJobs = allJobs.filter(job => !foundIds.has(job.id))
                    const hasMissing = missingIds.length > 0

                    return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-edit', {
                        values: { ...req.body, id: req.params.id },
                        errors,
                        availableJobs,
                        existingSelectedJobs,
                        warningMissingJobs: hasMissing
                            ? `Follwing ids dont exist (IDs: ${missingIds.join(', ')})`
                            : null,
                    })
                }

                console.error(err)
                throw err
            }
        })
    )

    TaskController.delete(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            await service.deleteById(id)
            return res.status(HttpStatus.OK).send('')
        })
    )

    const calcelDeadmanTaskParamSchema = z.object({
        id: z.string().min(1),
        token: z.string().min(36),
    })
    type calcelDeadmanTaskParamDto = z.infer<typeof calcelDeadmanTaskParamSchema>

    TaskController.get(
        '/:id/ping/:token',
        validate(calcelDeadmanTaskParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id, token } = vParams<calcelDeadmanTaskParamDto>(req)
            const task = await service.getCurrentDeadmanTask(id, token)
            if (!task) {
                return res.status(404).send('This deadman link is invalid or task was deleted.')
            }
            if (task.schedule_type !== 'deadman') {
                return res.status(400).send('This is not a deadman task.')
            }

            runnerService.cancelDeadmanTimer(task.id)

            if (task.is_single_time_only) {
                await service.updateTask(task.id, {
                    is_enabled: false,
                    next_run_at: null,
                    deadman_token: null,
                })

                return res.send('The task was cancelled and will not run.')
            } else {
                await service.updateTask(id, { deadman_token: null })
                return res.send(
                    'The current activation was cancelled. The task will run again later.'
                )
            }
        })
    )

    const jobsIdsFromBody = (body: any): string[] => {
        const v = body?.jobs_ids
        const arr = Array.isArray(v) ? v : v === undefined ? [] : [v]
        return arr.map(id => (id == null ? '' : String(id).trim())).filter(id => id.length > 0)
    }

    return TaskController
}
