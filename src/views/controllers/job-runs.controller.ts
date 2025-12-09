import { Router } from 'express'
import { JobRunService } from '../../modules/job-runs/job-runs.service'
import { listJobRunsQuerySchema } from '../../modules/job-runs/dtos/module.dtos'
import { getPaginationData } from '../../helpers/getPaginationData'
import { parseFormValuesMD } from '../../middlewares/parseFormValues'

export const JobRunsController = Router()
const service = new JobRunService()
JobRunsController.get('/', async (req, res) => {
    const params = listJobRunsQuerySchema.parse(req.query)
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
