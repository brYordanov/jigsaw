import { withTimeoutSignal } from './runWIthTimeoutSignal'

interface runWithRetriesParams {
    totalAttempts: number
    baseBackoffSeconds: number
    perRunTimeoutMs: number
    runOnce: (signal: AbortSignal) => Promise<{ ok: boolean } & Record<string, any>>
    outerSignal?: AbortSignal
}

export type runWithRetriesReturn = successReturn | failedReturn

type successReturn = {
    lastStatus: 'ok'
    attempts: number
    lastResult: Record<string, unknown>
}

type failedReturn = {
    lastStatus: 'failed'
    attempts: number
    lastResult: Record<string, unknown>
    lastError: string
}

export const runWithRetries = async ({
    totalAttempts,
    baseBackoffSeconds,
    perRunTimeoutMs,
    runOnce,
    outerSignal,
}: runWithRetriesParams): Promise<runWithRetriesReturn> => {
    let lastResult: any
    let lastError: string = ''
    let lastStatus: 'ok' | 'failed' = 'failed'

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        if (outerSignal?.aborted) {
            return {
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
            lastStatus = 'ok'

            if (result.ok) {
                return { attempts: attempt, lastStatus, lastResult }
            }
        } catch (err: any) {
            lastError = err?.message ?? err
            lastStatus = 'failed'
        }

        if (attempt < totalAttempts) {
            const waitMs = exponentialBackoffMs(baseBackoffSeconds, attempt - 1)
            await sleep(waitMs)
        }
    }

    return { attempts: totalAttempts, lastStatus: 'failed', lastResult, lastError }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const exponentialBackoffMs = (baseSeconds: number, attempt: number) => {
    const baseMs = baseSeconds * 1000
    const exp = Math.max(1, attempt - 1)
    const raw = baseMs * Math.pow(2, exp)
    const jitter = 0.8 + Math.random() * 0.4
    return Math.round(raw * jitter)
}
