import { withTimeoutSignal } from './runWIthTimeoutSignal'
import { RunAttemptLog } from './types'

interface runWithRetriesParams {
    totalAttempts: number
    baseBackoffSeconds: number
    perRunTimeoutMs: number
    runOnce: (signal: AbortSignal) => Promise<{ ok: boolean } & Record<string, any>>
    outerSignal?: AbortSignal
    onAttempt?: (log: RunAttemptLog) => Promise<void>
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

/**
 * Repeatedly calls `runOnce` with timeout + backoff.
 * Reports each attempt via `onAttempt` but only returns once
 * (either first lastStatus='ok' result, abort, or after N failed attempts).
 */
export const runWithRetries = async ({
    totalAttempts,
    baseBackoffSeconds,
    perRunTimeoutMs,
    runOnce,
    outerSignal,
    onAttempt,
}: runWithRetriesParams): Promise<runWithRetriesReturn> => {
    let lastResult: any
    let lastError: string = ''
    let lastStatus: 'ok' | 'failed' = 'failed'

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        if (outerSignal?.aborted) {
            const log: RunAttemptLog = {
                attempt: attempt - 1,
                status: 'failed',
                result: lastResult,
                error: 'aborted',
                aborted: true,
            }
            await onAttempt?.(log)

            return {
                attempts: attempt - 1,
                lastStatus: 'failed',
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
                await onAttempt?.({
                    attempt,
                    status: lastStatus,
                    result,
                })
                return { attempts: attempt, lastStatus, lastResult }
            }
        } catch (err: any) {
            lastError = err?.message ?? err
            lastStatus = 'failed'

            await onAttempt?.({
                attempt,
                status: 'failed',
                error: lastError,
            })
        }

        if (attempt < totalAttempts) {
            const waitMs = exponentialBackoffMs(baseBackoffSeconds, attempt - 1)
            await sleep(waitMs)
        }
    }

    await onAttempt?.({
        attempt: totalAttempts,
        status: 'failed',
        result: lastResult,
        error: lastError,
    })

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
