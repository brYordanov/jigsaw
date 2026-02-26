import { Server } from 'http'
import { createApp } from './app'
import { shutdownDb } from './db/db'
import { createContainer } from './modules/createContainer'

const PORT = process.env.PORT || 3000
const container = createContainer()
const app = createApp(container)

let server: Server
let isShuttingDown = false

async function start() {
    await container.pool.query('SELECT 1')

    // container.taskSchedulerService.startCron()
    // container.runnerService.restoreDeadmanTimers()

    server = app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`)
    })

    server.on('error', err => {
        console.error('❌ HTTP server error:', err)
    })
}

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true
    console.log(`Received ${signal}, shutting down gracefully...`)
    try {
        if (server) {
            server.closeAllConnections()
            server.close()
        }
        container.taskSchedulerService.stopCron()
        console.log(`pool: total=${container.pool.totalCount} idle=${container.pool.idleCount} waiting=${container.pool.waitingCount}`)
        await shutdownDb(container.pool)
        console.log('[shutdown] pool closed')
    } catch (e) {
        console.error('[shutdown] error:', e)
    } finally {
        console.log('[shutdown] calling process.exit(0)')
        process.exit(0)
    }
}

;['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(sig => {
    process.on(sig, () => gracefulShutdown(sig))
})

start().catch(err => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
})
