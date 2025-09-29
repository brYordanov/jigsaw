import { RequestHandler } from 'express'

const coercers = {
    bool: (v: unknown) => {
        if (typeof v === 'boolean') return v
        const s = String(v).toLowerCase()
        if (['true', 'on', '1', 'yes'].includes(s)) return true
        if (['false', 'off', '0', 'no'].includes(s)) return false
        return v
    },
    json: (v: unknown) => {
        if (typeof v !== 'string') return v
        const t = v.trim()
        if (!t) return undefined
        try {
            return JSON.parse(t)
        } catch {
            return v
        }
    },
    number: (v: unknown) => {
        if (typeof v === 'number') return v
        try {
            console.log(111)

            if (typeof v === 'string') return Number(v)
        } catch {
            return v
        }
    },
} as const

const coerceKey = (key: string, value: any, out: any): void => {
    const i = key.lastIndexOf('/')
    if (i === -1) {
        out[key] = transform(value)
        return
    }

    const base = key.slice(0, i)
    const type = key.slice(i + 1).toLowerCase()

    const coerce = (coercers as any)[type]
    if (!coerce) {
        out[key] = transform(value)
        return
    }

    const coerced = coerce(value)
    if (coerced !== undefined) {
        out[base] = transform(coerced)
    }
}

const transform = (node: any): any => {
    if (Array.isArray(node)) {
        return node.map(transform)
    }
    if (node && typeof node === 'object') {
        const out: any = {}
        for (const [k, v] of Object.entries(node)) {
            coerceKey(k, v, out)
        }
        return out
    }
    return node
}

export const parseFormValuesMD: RequestHandler = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = transform(req.body)
    }
    const body = req.body
    console.log(body)

    next()
}
