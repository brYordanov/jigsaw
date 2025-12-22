import { RequestHandler } from 'express'
import z from 'zod'

type ValidationTarget = 'body' | 'params' | 'query'
export const validate = (schema: z.ZodType<unknown>, target: ValidationTarget): RequestHandler => {
    return (req, _res, next) => {
        let validationCandidate
        switch (target) {
            case 'body':
                validationCandidate = req.body
                break
            case 'params':
                validationCandidate = req.params
                break
            case 'query':
                validationCandidate = req.query
            default:
                throw new Error(`Unsupported validation target: ${target}`)
        }
        const parsed = schema.parse(validationCandidate)
        req[target] = parsed
        next()
    }
}
