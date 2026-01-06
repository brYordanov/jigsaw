import { Router } from 'express'
import { validate, vParams } from '../middlewares/validate'
import { idParamDto, idParamSchema } from '../commonSchemas'
import { asyncHandler } from '../helpers/asyncHandler'
import z from 'zod'
import { RunnerService } from '../modules/execution/runner.service'

const runIdParamSchema = z.object({ runId: z.string().min(1) })
type runIdParamDto = z.infer<typeof runIdParamSchema>

export function createRunRouter(runnerService: RunnerService) {
    const runRouter = Router()

    runRouter.post(
        '/job/:id/start',
        validate(idParamSchema, 'params'),
        asyncHandler(async (req, res) => {
            const { id } = vParams<idParamDto>(req)
            const { runId } = await runnerService.startJobById(id)
            res.json({ ok: true, runId })
        })
    )

    runRouter.post('/:runId/cancel', validate(runIdParamSchema, 'params'), (req, res) => {
        const { runId } = vParams<runIdParamDto>(req)
        res.json(runnerService.cancelRun(runId))
    })

    runRouter.get('/:runId/stream', validate(runIdParamSchema, 'params'), (req, res) => {
        const { runId } = vParams<runIdParamDto>(req)

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\n`)
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        }

        const snapshot = runnerService.getRun(runId)
        if (!snapshot) {
            sendEvent('gone', { runId })
            return res.end()
        }
        if (snapshot.state === 'running') {
            sendEvent('started', { runId })
        } else if (snapshot.state === 'finished') {
            sendEvent('finished', { runId, outcome: snapshot.result })
            return res.end()
        } else if (snapshot.state === 'canceled') {
            sendEvent('canceled', { runId })
            return res.end()
        }

        const unsubscribe = runnerService.subscribe(runId, event => {
            if (event.type === 'started') sendEvent('started', { runId })
            if (event.type === 'canceled') {
                sendEvent('canceled', { runId })
                res.end()
                unsubscribe()
            }
            if (event.type === 'finished') {
                sendEvent('finished', { runId, outcome: event.outcome })
                res.end()
                unsubscribe()
            }
        })

        const heartbeat = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 15000)

        req.on('close', () => {
            clearInterval(heartbeat)
            unsubscribe()
        })
    })

    return runRouter
}
