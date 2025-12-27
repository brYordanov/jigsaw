import { Router } from 'express'
import { Container } from '../modules/createContainer'
import { createJobRouter } from './job.router'
import { createRunRouter } from './run.router'
import { createTaskRouter } from './task.router'

export function createApiRouter(container: Container) {
    const api = Router()

    api.use('/jobs', createJobRouter(container.jobService))
    api.use('/run', createRunRouter(container.runnerService))
    api.use('/tasks', createTaskRouter(container.taskService))

    let count = 0
    api.get('/test', (req, res) => {
        count++
        // if (count < 3) throw new Error('random err')
        // setTimeout(() => res.status(200).send('test EP hit'), 5000)
        res.status(200).send('test EP hit')
    })

    api.use('/test-second', (req, res) => {
        res.status(200).send('second test EP')
    })

    return api
}
