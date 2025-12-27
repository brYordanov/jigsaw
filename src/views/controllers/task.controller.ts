import { Router } from 'express'
import {
    CreateTaskBodyDto,
    createTaskSchema,
    ListTasksQueryDto,
    listTasksQuerySchema,
} from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { ZodError } from 'zod'
import { getPaginationData } from '../../helpers/getPaginationData'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import { JobService } from '../../modules/jobs/job.service'
import { validate, vBody, vParams, vQuery } from '../../middlewares/validate'
import { asyncHandler } from '../../helpers/asyncHandler'
import { idParamDto, idParamSchema } from '../../commonSchemas'

export function createTaskController(service: TaskService, jobService: JobService) {
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

                await service.updateTask(id, dto, currentTask.interval_type)

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

    const jobsIdsFromBody = (body: any): string[] => {
        const v = body?.jobs_ids
        const arr = Array.isArray(v) ? v : v === undefined ? [] : [v]
        return arr.map(id => (id == null ? '' : String(id).trim())).filter(id => id.length > 0)
    }

    return TaskController
}
