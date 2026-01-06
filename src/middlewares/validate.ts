import { Request, RequestHandler } from 'express'
import z from 'zod'

type ValidationTarget = 'body' | 'params' | 'query'

declare global {
    namespace Express {
        interface Request {
            validated?: Partial<Record<ValidationTarget, unknown>>
        }
    }
}

export const validate = <T>(schema: z.ZodType<T>, target: ValidationTarget): RequestHandler => {
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
                break
            default:
                throw new Error(`Unsupported validation target: ${target}`)
        }
        const parsed = schema.parse(validationCandidate)
        req.validated = req.validated ?? {}
        req.validated[target] = parsed
        next()
    }
}

export const vBody = <T>(req: Request) => req.validated!.body as T
export const vQuery = <T>(req: Request) => req.validated!.query as T
export const vParams = <T>(req: Request) => req.validated!.params as T
