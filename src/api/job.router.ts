import { Router } from 'express'
import { listJobsQuerySchema } from '../modules/jobs/dtos/module.dtos'
import { JobService } from '../modules/jobs/job.service'

export const jobRouter = Router()
const service = new JobService()

jobRouter.get('/', async (req, res) => {
    res.send(await service.getAll())
})

jobRouter.get('/paginate', async (req, res) => {
    const parsed = listJobsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
        res.send('param validation error')
        return
    }
    res.send(await service.paginate(parsed.data))
})

jobRouter.get('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.getByIdOrFail(id))
})

jobRouter.post('/', async (req, res) => {
    res.send(await service.createJob(req.body))
})

jobRouter.patch('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.updateJob(id, req.body))
})

jobRouter.delete('/:id', async (req, res) => {
    const { id } = req.params
    res.send(await service.deleteById(id))
})
