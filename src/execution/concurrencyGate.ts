export class ConcurrencyGate {
    private active = new Map<string, number>()
    private queue = new Map<
        string,
        Array<{ resume: () => void; reject: (err: any) => void; signal?: AbortSignal }>
    >()

    async run<T>(
        key: string,
        limit: number,
        fn: () => Promise<T>,
        signal?: AbortSignal
    ): Promise<T> {
        if (limit <= 0 || !Number.isFinite(limit)) limit = 1

        const currentCount = this.active.get(key) ?? 0
        if (currentCount < limit) {
            this.active.set(key, currentCount + 1)
            try {
                return await fn()
            } finally {
                this.release(key)
            }
        }

        let onAbort: (() => void) | undefined

        const holdExecution = new Promise<void>((resolve, reject) => {
            const currentJobWaiters = this.queue.get(key) || []
            currentJobWaiters.push({ resume: resolve, reject, signal })

            this.queue.set(key, currentJobWaiters)

            if (signal) {
                if (signal.aborted) {
                    this.removeFromQueue(key, resolve, reject)
                    return reject(new Error('aborted'))
                }
                onAbort = () => {
                    this.removeFromQueue(key, resolve, reject)
                    reject(new Error('aborted'))
                }

                signal.addEventListener('abort', onAbort, { once: true })
            }
        })

        await holdExecution
        if (onAbort) signal?.removeEventListener('abort', onAbort)

        this.active.set(key, (this.active.get(key) ?? 0) + 1)

        try {
            return await fn()
        } finally {
            this.release(key)
        }
    }

    private release(key: string) {
        const currentRunsCount = (this.active.get(key) ?? 1) - 1
        if (currentRunsCount <= 0) this.active.delete(key)
        else this.active.set(key, currentRunsCount)

        const currentJobWaiters = this.queue.get(key)
        if (!currentJobWaiters || currentJobWaiters.length === 0) return

        let nextIdx = -1

        for (let i = 0; i < currentJobWaiters.length; i++) {
            const waiter = currentJobWaiters[i]
            if (waiter.signal?.aborted) {
                const [abortedWaiter] = currentJobWaiters.splice(i, 1)
                abortedWaiter.reject(new Error('aborted'))
                i--
                continue
            }

            nextIdx = i
            break
        }

        if (nextIdx >= 0) {
            const [nextWaiter] = currentJobWaiters.splice(nextIdx, 1)
            nextWaiter.resume()
        }

        if (currentJobWaiters.length === 0) this.queue.delete(key)
    }

    private removeFromQueue(key: string, resolveRef: () => void, rejectRef: (err: any) => void) {
        const currentJobWaiters = this.queue.get(key)
        if (!currentJobWaiters) return
        const idx = currentJobWaiters.findIndex(
            waiter => waiter.resume === resolveRef && waiter.reject === rejectRef
        )
        if (idx >= 0) currentJobWaiters.splice(idx, 1)
        if (currentJobWaiters.length === 0) this.queue.delete(key)
    }
}
