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
                    reject(new Error('Aborted'))
                }
                onAbort = () => {
                    this.removeFromQueue(key, resolve, reject)
                    reject(new Error('Aborted'))
                }

                signal.addEventListener('abort', onAbort, { once: true })
            }
        })

        try {
            await holdExecution
        } catch (e) {
            if (onAbort) signal?.removeEventListener('abort', onAbort)
            throw e
        } finally {
            if (onAbort) signal?.removeEventListener('abort', onAbort)
        }

        this.active.set(key, (this.active.get(key) ?? 0) + 1)

        try {
            return await fn()
        } finally {
            this.release(key)
        }
    }

    release(key: string) {}

    removeFromQueue(key: string, resolveRef: () => void, rejectRef: (err: any) => void) {}
}
