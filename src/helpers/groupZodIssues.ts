import { ZodError } from 'zod'

export function groupZodIssues(issues: ZodError['issues']) {
    const nested: any = {}
    for (const issue of issues) {
        const path = issue.path.length ? issue.path : ['_root']
        let cur = nested
        for (let i = 0; i < path.length - 1; i++) {
            const k = String(path[i])
            cur[k] ??= {}
            cur = cur[k]
        }
        const leaf = String(path[path.length - 1] ?? '_root')
        if (cur[leaf] == null) cur[leaf] = issue.message
    }
    return nested
}
