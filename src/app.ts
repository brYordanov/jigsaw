import express from 'express'
import path from 'path'
import expressLayouts from 'express-ejs-layouts'
import { viewRouter } from './views/intex'
import { apiRouter } from './api'

const app = express()
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, '../public')))
app.use(expressLayouts)

app.set('layout', 'layouts/default')
app.use('/', viewRouter)
app.use('/api', apiRouter)

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
