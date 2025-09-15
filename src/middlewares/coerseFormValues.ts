import { RequestHandler } from 'express'

const toIntArr = (str: string) => {
    if (!str) return []
    return Array.from(
        new Set(
            str
                .split(',')
                .map(val => val.trim())
                .filter(val => val !== '')
                .map((val: string) => Number(val))
        )
    )
}

export const coerseFormValuesMD: RequestHandler = (req, _res, next) => {
    const body = req.body

    req.body = {
        ...body,
        is_enabled: body['is_enabled'] === 'on' ? true : false,
        is_single_time_only: body['is_single_time_only'] === 'on' ? true : false,
        days_of_month: toIntArr(body['days_of_month']),
        hours: toIntArr(body['hours']),
        minutes: toIntArr(body['minutes']),
        expires_at: body['expires_at'] ? new Date(body['expires_at']).toISOString() : null,
        timeout_seconds: Number(body['timeout_seconds']) ? Number(body['timeout_seconds']) : null,
    }

    next()
}
