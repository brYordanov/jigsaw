import { Router } from 'express'
import { JobRunService } from '../../modules/job-runs/job-runs.service'
import {
    listJobRunsQueryDto,
    listJobRunsQuerySchema,
} from '../../modules/job-runs/dtos/module.dtos'
import { getPaginationData } from '../../helpers/getPaginationData'
import { validate, vQuery } from '../../middlewares/validate'
import { asyncHandler } from '../../helpers/asyncHandler'

export function createjobRunsController(service: JobRunService) {
    const JobRunsController = Router()

    JobRunsController.get(
        '/',
        validate(listJobRunsQuerySchema, 'query'),
        asyncHandler(async (req, res) => {
            const params = vQuery<listJobRunsQueryDto>(req)
            const { items: jobRuns, total, limit, offset } = await service.paginate(params)
            const paginateData = getPaginationData({ limit, offset, total, filters: params })

            if (req.get('HX-Request') === 'true') {
                return res.render('partials/job-runs-list-section', {
                    jobRuns,
                    filterValues: params,
                    paginateData,
                    module: 'job-runs',
                    layout: false,
                })
            }

            res.render('pages/job-runs-list', {
                jobRuns,
                filterValues: params,
                paginateData,
                module: 'job-runs',
            })
        })
    )

    return JobRunsController
}
