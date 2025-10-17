import { Router } from 'express'
import { createTaskSchema, listTasksQuerySchema } from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { ZodError } from 'zod'
import { getPaginationData } from '../../helpers/getPaginationData'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'
import { JobService } from '../../modules/jobs/job.service'

export const ViewTaskRouter = Router()
const service = new TaskService()
const jobService = new JobService()

ViewTaskRouter.get('/', async (req, res) => {
    const params = listTasksQuerySchema.parse(req.query)
    const { items: tasks, total, limit, offset } = await service.paginate(params)
    const paginateData = getPaginationData({ limit, offset, total, filters: params })

    if (req.get('HX-Request') === 'true') {
        return res.render('partials/task-list-section', {
            tasks,
            filterValues: params,
            paginateData,
            layout: false,
        })
    }

    res.render('pages/task-list', {
        tasks,
        filterValues: params,
        paginateData,
    })
})

ViewTaskRouter.get('/create', async (req, res) => {
    const availableJobs = await jobService.getAll()
    res.render('pages/task-create', {
        values: {},
        errors: {},
        availableJobs,
        existingSelectedJobs: [],
    })
})

ViewTaskRouter.post('/create', parseFormValuesMD, async (req, res) => {
    try {
        const dto = createTaskSchema.parse(req.body)
        await service.createTask(dto)

        return res.redirect(`/task`)
    } catch (err: any) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)
            const allJobs = await jobService.getAll()

            const selectedIds = jobsIdsFromBody(req.body)
            const existingSelectedJobs = await jobService.getManyJobsByid(selectedIds)
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
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

ViewTaskRouter.get('/edit/:id', async (req, res) => {
    const id = Number(req.params.id)
    const task = await service.getByIdOrFail(id)

    res.render('pages/task-edit', { values: task, errors: {} })
})

ViewTaskRouter.post('/edit/:id', parseFormValuesMD, async (req, res) => {
    try {
        const id = Number(req.params.id)

        const currentTask = await service.getByIdOrFail(id)
        const candidate = { ...currentTask, ...req.body }
        const dto = createTaskSchema.parse(candidate)

        await service.updateTask(id, dto)

        return res.redirect(`/task`)
    } catch (err) {
        if (err instanceof ZodError) {
            const errors = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-edit', {
                values: req.body,
                errors,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})

ViewTaskRouter.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    await service.deleteById(id)
    return res.status(HttpStatus.OK).send('')
})

const jobsIdsFromBody = (body: any): string[] => {
    const v = body?.jobs_ids
    const arr = Array.isArray(v) ? v : v === undefined ? [] : [v]
    return arr.map(id => (id == null ? '' : String(id).trim())).filter(id => id.length > 0)
}
