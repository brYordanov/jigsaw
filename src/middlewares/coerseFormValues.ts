import { RequestHandler } from 'express'

const toIntArr = (str: string) => {
    if (!str) return []
    return str.split(',').map((val: string) => Number(val))
}

export const coerseFormValues: RequestHandler = (req, _res, next) => {
    const body = req.body
    req.body = body

    body['is_enabled'] = body['is_enabled'] === 'on' ? true : false
    body['is_single_time_only'] = body['is_single_time_only'] === 'on' ? true : false
    body['days_of_month'] = toIntArr(body['days_of_month'])
    body['hours'] = toIntArr(body['hours'])
    body['minutes'] = toIntArr(body['minutes'])
    body['expires_at'] = body['expires_at'] ? new Date(body['expires_at']).toISOString() : null
    body['timeout_seconds'] = Number(body['timeout_seconds'])
    body['timeout_seconds'] = body['timeout_seconds'] ? body['timeout_seconds'] : null
    next()
}
