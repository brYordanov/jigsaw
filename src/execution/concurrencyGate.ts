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

        if ((this.active.get(key) ?? 0) < limit) {
            this.active.set(key, (this.active.get(key) ?? 0) + 1)
            try {
                return await fn()
            } finally {
                this.release(key)
            }
        }
    }
}
