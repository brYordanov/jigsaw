import express from 'express'
import path from 'path'
import expressLayouts from 'express-ejs-layouts'
import cookieParser from 'cookie-parser'
import { viewRouter } from './views/intex'
import { createContainer } from './modules/createContainer'
import { createApiRouter } from './api/createApiRouter'

export function createApp() {
    const app = express()

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

    const container = createContainer()
    app.use('/', viewRouter)
    app.use('/api', createApiRouter(container))

    app.use((err: any, req: any, res: any, _next: any) => {
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

    return app
}
