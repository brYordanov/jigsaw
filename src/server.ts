import { createApp } from './app'
import { pool, shutdownDb } from './db/db'
import { Server } from 'http'

const PORT = process.env.PORT || 3000
const app = createApp()

let server: Server

async function start() {
    await pool.query('SELECT 1')

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
        await shutdownDb()
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
