import { Router } from 'express'
import { RunnerService } from '../execution/runner.service'
import { send } from 'process'

export const runRouter = Router()

const runnerService = new RunnerService()

runRouter.post('/job/:id/start', async (req, res) => {
    const { runId } = await runnerService.startJobById(req.params.id)
    res.json({ ok: true, runId })
})

runRouter.post('/:runId/cancel', (req, res) => {
    res.json(runnerService.cancelRun(req.params.runId))
})

runRouter.get('/:runId/stream', (req, res) => {
    const { runId } = req.params

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    ;(res as any).flushHeaders?.()

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

    const hb = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 15000)

    req.on('close', () => {
        clearInterval(hb)
        unsubscribe()
    })
})
