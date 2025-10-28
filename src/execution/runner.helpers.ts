import { json } from 'zod'

export const runWithRetries = async (
    totalAttempts: number,
    baseBackoffSeconds: number,
    perRunTimeoutMs: number,
    runOnce: (signal: AbortSignal) => Promise<{ ok: boolean } & Record<string, any>>,
    outerSignal?: AbortSignal
) => {
    let lastResult: any
    let lastError: string | undefined
    let lastStatus: 'success' | 'failed' = 'failed'

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        if (outerSignal?.aborted) {
            return {
                ok: false,
                attempts: attempt - 1,
                lastStatus: 'failed' as const,
                lastResult,
                lastError: 'aborted',
            }
        }

        try {
            const result = await withTimeoutSignal(
                perRunTimeoutMs,
                signal => runOnce(signal),
                outerSignal
            )
            lastResult = result
            lastStatus = result.ok ? 'success' : 'failed'

            if (result.ok) return { ok: true, attempts: attempt, lastStatus: 'success', lastResult }
        } catch (err: any) {
            lastError = err?.message ?? err
            lastStatus = 'failed'
        }

        if (attempt < totalAttempts) {
            const waitMs = exponentialBackoffMs(baseBackoffSeconds, attempt - 1)
            await sleep(waitMs)
        }
    }

    return { ok: false, totalAttempts, lastStatus: 'failed', lastResult, lastError }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const exponentialBackoffMs = (baseSeconds: number, attempt: number) => {
    const baseMs = baseSeconds * 1000
    const exp = Math.max(1, attempt - 1)
    const raw = baseMs * Math.pow(2, exp)
    const jitter = 0.8 + Math.random() * 0.4
    return Math.round(raw * jitter)
}

const withTimeoutSignal = async <T>(
    ms: number,
    run: (signal: AbortSignal) => Promise<T>,
    externalSignal?: AbortSignal
) => {
    const controller = new AbortController()

    const useTimer = Number.isFinite(ms as number) && (ms as number) > 0
    const timeout = useTimer ? setTimeout(() => controller.abort(), ms) : null
    const onExternalAbort = () => controller.abort()

    if (externalSignal) {
        if (externalSignal.aborted) controller.abort()
        else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }

    return run(controller.signal).finally(() => {
        if (timeout) clearTimeout(timeout)
        externalSignal?.removeEventListener('abort', onExternalAbort)
    })
}
