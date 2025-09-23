import z from "zod"

export const isoDate = z.coerce.date().transform(d => d.toISOString())

export const futureDate = isoDate.refine(
    date => {
        if (!date) return true
        const now = new Date()
        const dateVal = new Date(date)
        return dateVal > now
    },
    { message: 'Expiration date must be in the future' }
)

export const qBool = z.preprocess(v => {
    if (v === 'true' || v === true) return true
    if (v === 'false' || v === false) return false
    return undefined
}, z.boolean().optional())

export const qAny = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((v: unknown) => {
        if (Array.isArray(v)) v = v[v.length - 1]
        if (v === undefined || v === null || v === '' || v === 'any') return undefined
        return v
    }, schema.optional())
