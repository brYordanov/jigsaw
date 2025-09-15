import { RequestHandler } from 'express'

export const normalizeFormValuesMD: RequestHandler = (req, _res, next) => {
    const body = req.body

    req.body = normalizeFormValues(body)

    next()
}

export const normalizeFormValues = (body: any) => {
    return {
        ...body,
        expires_at: body['expires_at'] ? body['expires_at'].slice(0, 10) : '',
    }
}
