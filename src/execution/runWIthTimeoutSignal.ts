export const withTimeoutSignal = async <T>(
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
