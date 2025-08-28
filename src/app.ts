import express from 'express'
import path from 'path'
import expressLayouts from 'express-ejs-layouts'
import { viewRouter } from './views/intex'
import { apiRouter } from './api'
import { pool, shutdownDb } from './db/db'

const app = express()
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, '../public')))
app.use(expressLayouts)

app.set('layout', 'layouts/default')
app.use('/', viewRouter)
app.use('/api', apiRouter)

async function start() {
    await pool.query('SELECT 1')
    app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`)
    })
}

const downSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
downSignals.forEach(sig => {
    process.on(sig, async () => {
        try {
            await shutdownDb()
        } finally {
            process.exit(0)
        }
    })
})

start().catch(err => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
})
