import { Router } from 'express'
import { JobService } from '../modules/jobs/job.service'
import { ListJobsQueryDto, listJobsQuerySchema } from '../modules/jobs/dtos/module.dtos'
import { CreateJobBodyDto, createJobBodySchema } from '../modules/jobs/dtos/create-job.dto'
import { UpdateJobBodyDto, updateJobBodySchema } from '../modules/jobs/dtos/update-job.dto'
import { asyncHandler } from '../helpers/asyncHandler'
import { validate, vBody, vParams, vQuery } from '../middlewares/validate'
import { HttpStatus } from '../helpers/statusCodes'
import { idParamDto, idParamSchema } from '../commonSchemas'

export function createJobRouter(service: JobService) {
    const jobRouter = Router()

    jobRouter.get(
        '/',
        asyncHandler(async (_req, res) => {
            res.json(await service.getAll())
        })
    )

    jobRouter.get(
        '/paginate',
        validate(listJobsQuerySchema, 'query'),
        asyncHandler(async (req, res) => {
            const query = vQuery<ListJobsQueryDto>(req)
            res.json(await service.paginate(query))
        })
    )

    jobRouter.get(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            res.json(await service.getByIdOrFail(id))
        })
    )

    jobRouter.post(
        '/',
        validate(createJobBodySchema, 'body'),
        asyncHandler(async (req, res) => {
            const body = vBody<CreateJobBodyDto>(req)
            res.status(HttpStatus.CREATED).json(await service.createJob(body))
        })
    )

    jobRouter.patch(
        '/:id',
        validate(idParamSchema, 'params'),
        validate(updateJobBodySchema, 'body'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            const body = vBody<UpdateJobBodyDto>(req)
            res.json(await service.updateJob(id, body))
        })
    )

    jobRouter.delete(
        '/:id',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            await service.deleteById(id)
            res.status(HttpStatus.NO_CONTENT).send()
        })
    )

    return jobRouter
}
