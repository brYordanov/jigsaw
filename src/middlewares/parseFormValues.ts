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
        if (typeof v !== 'string') throw new Error('Cannot coerce non-string to JSON')
        const t = v.trim()
        if (!t) return undefined
        try {
            return JSON.parse(t)
        } catch (err) {
            throw new Error('Invalid JSON string' + err)
        }
    },
    number: (v: unknown) => {
        if (!v) return null
        if (typeof v === 'number') return v
        if (typeof v === 'string') return Number(v)
    },
    intArr: (v: unknown) => {
        if (typeof v === 'string') {
            if (!v) return null
            const arr = v.split(',').map(strV => Number(strV))

            return arr.length !== 0 ? arr : null
        }
        throw new Error(`Cannot coerce to intArr. value: ${v} type: ${typeof v}`)
    },
    date: (v: unknown) => {
        try {
            if (!v) return null

            const d = new Date(v as any)
            if (isNaN(d.getTime())) {
                throw new Error(`Cannot coerce to date. value: ${v} type: ${typeof v}`)
            }
            return d
        } catch (err) {
            throw new Error(`Cannot coerce to date. value: ${v} type: ${typeof v}`)
        }
    },
    count: (v: unknown) => {
        try {
            const num = Number(v)
            if (isNaN(num) || num < 0 || !num) return null
            return num
        } catch (err) {
            throw new Error(`Cannot coerce to count. value: ${v} type: ${typeof v}`)
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
    const type = key.slice(i + 1)

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
    if (node instanceof Date) {
        return node
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
    console.log(req.body)

    if (req.body && typeof req.body === 'object') {
        req.body = transform(req.body)
    }

    next()
}
