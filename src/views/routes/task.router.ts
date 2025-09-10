import { Router } from 'express'
import { createTaskSchema, listTasksQuerySchema } from '../../modules/tasks/task.dtos'
import { TaskService } from '../../modules/tasks/task.service'
import { HttpStatus } from '../../helpers/statusCodes'
import { coerseFormValuesMD } from '../../middlewares/coerseFormValues'
import { groupZodIssues } from '../../helpers/groupZodIssues'
import { ZodError } from 'zod'
import { normalizeFormValues } from '../../middlewares/normalizeFormValues'

export const ViewTaskRouter = Router()
const service = new TaskService()

function buildPager({
    limit,
    offset,
    total,
    filters,
}: {
    limit: number
    offset: number
    total: number
    filters: Record<string, any>
}) {
    const toQueryString = (obj: Record<string, any>) =>
        '?' +
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
            .join('&')

    const prevOffset = Math.max(0, offset - limit)
    const nextOffset = offset + limit < total ? offset + limit : null

    return {
        hasPrev: offset > 0,
        hasNext: nextOffset !== null,
        prevHref: offset > 0 ? toQueryString({ ...filters, limit, offset: prevOffset }) : null,
        nextHref:
            nextOffset !== null ? toQueryString({ ...filters, limit, offset: nextOffset }) : null,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
    }
}

ViewTaskRouter.get('/', async (req, res) => {
    const params = listTasksQuerySchema.parse(req.query)
    const { items: tasks, total, limit, offset } = await service.paginate(params)
    const paginateData = buildPager({ limit, offset, total, filters: params })

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

ViewTaskRouter.get('/create', (req, res) => {
    res.render('pages/task-create', { values: {}, errors: {} })
})

ViewTaskRouter.post('/create', coerseFormValuesMD, async (req, res) => {
    try {
        const dto = createTaskSchema.parse(req.body)
        const task = await service.createTask(dto)

        return res.redirect(`/task`)
    } catch (err: any) {
        if (err instanceof ZodError) {
            const { firstPerField, grouped } = groupZodIssues(err.issues)

            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).render('pages/task-create', {
                values: normalizeFormValues(req.body),
                errors: firstPerField,
            })
        }

        console.error(err)
        return res.status(HttpStatus.UNEXPECTED_SERVER_ERROR).render('errors/500')
    }
})
