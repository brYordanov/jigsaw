import { Server } from 'http'
import { createApp } from './app'
import { createPool, shutdownDb } from './db/db'
import { createContainer } from './modules/createContainer'

const PORT = process.env.PORT || 3000
const container = createContainer()
const app = createApp(container)

const connectionStr = process.env.DATABASE_URL
if (!connectionStr) throw new Error('❌ Missing Test Connection String')
const pool = createPool(connectionStr)

let server: Server

async function start() {
    await pool.query('SELECT 1')

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
    console.log(`Received ${signal}, shutting down gracefully...`)
    try {
        if (server) {
            await new Promise<void>((resolve, reject) =>
                server!.close(err => (err ? reject(err) : resolve()))
            )
        }
        container.taskSchedulerService.stopCron()
        await shutdownDb(container.pool)
    } catch (e) {
        console.error('Error during shutdown:', e)
    }
}

;['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(sig => {
    process.on(sig, () => gracefulShutdown(sig))
})

start().catch(err => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
})
