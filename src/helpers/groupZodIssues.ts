import { ZodError } from 'zod'

export const groupZodIssues = (issues: ZodError['issues']) => {
    const grouped: Record<string, string[]> = {}

    for (const issue of issues) {
        const [root, ...rest] = issue.path
        const field = String(root ?? '_form')
        const trail = rest.map(p => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`)).join('')
        const msg = trail ? `${trail} ${issue.message}` : issue.message
        ;(grouped[field] ??= []).push(msg)
    }

    // If your template expects single strings per field, join them:
    const firstPerField: Record<string, string> = {}
    for (const [k, arr] of Object.entries(grouped)) firstPerField[k] = arr.join('; ')
    return { grouped, firstPerField }
}
