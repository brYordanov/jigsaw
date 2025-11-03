import express from 'express'
import path from 'path'
import expressLayouts from 'express-ejs-layouts'
import { viewRouter } from './views/intex'
import { apiRouter } from './api'
import { pool, shutdownDb } from './db/db'
import { Server } from 'http'
import cookieParser from 'cookie-parser'
const app = express()
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, '../public')))
app.use(expressLayouts)
app.use(cookieParser())

app.use((req, res, next) => {
    const theme = req.cookies.theme
    res.locals.theme = theme === 'light' || theme === 'dark' ? theme : null
    next()
})
app.use((req, res, next) => {
    res.locals.currentPath = req.path
    next()
})
app.set('layout', 'layouts/default')
app.use('/', viewRouter)
app.use('/api', apiRouter)

app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500
    const wantsJson = (req.headers.accept || '').includes('application/json') || req.xhr

    if (wantsJson) {
        return res.status(status).json({
            ok: false,
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        })
    }

    res.status(status).type('text').send(`Error: ${err.message}`)
})

let server: Server | undefined

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

const downSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGUSR2']
downSignals.forEach(sig => {
    process.on(sig, () => gracefulShutdown(sig))
})

start().catch(err => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
})
