import { Router } from 'express'
import { Container } from '../../modules/createContainer'
import { createjobRunsController } from './job-runs.controller'
import { createJobController } from './job.controller'
import { createTaskController } from './task.controller'

export function createViewController(container: Container) {
    const viewController = Router()

    viewController.use('/job-runs', createjobRunsController(container.jobRunService))
    viewController.use('/job', createJobController(container.jobService, container.runnerService))
    viewController.use('/task', createTaskController(container.taskService, container.jobService))

    viewController.get('/', (req, res) => {
        res.render('pages/index')
    })

    return viewController
}
