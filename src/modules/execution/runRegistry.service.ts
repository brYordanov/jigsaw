export type RunState = 'running' | 'canceled' | 'finished'

type RunEvent =
    | { type: 'started'; runId: string }
    | { type: 'finished'; runId: string; outcome: any }
    | { type: 'canceled'; runId: string }

type Listener = (ev: RunEvent) => void

export class RunRegistry {
    private runs = new Map<
        string,
        {
            jobId: string
            state: RunState
            controller: AbortController
            result?: any
        }
    >()
    private listeners = new Map<string, Set<Listener>>()

    create(jobId: string) {
        const runId = crypto.randomUUID()
        this.runs.set(runId, { jobId, state: 'running', controller: new AbortController() })
        this.emit(runId, { type: 'started', runId })
        return { runId, controller: this.runs.get(runId)!.controller }
    }

    finish(runId: string, outcome: any) {
        const run = this.runs.get(runId)
        if (!run) return
        run.state = 'finished'
        run.result = outcome
        this.emit(runId, { type: 'finished', runId, outcome })
        setTimeout(() => this.runs.delete(runId), 60_000)
    }

    get(runId: string) {
        return this.runs.get(runId)
    }

    cancel(runId: string) {
        const run = this.runs.get(runId)
        if (!run || run.state !== 'running') return false

        run.state = 'canceled'
        run.controller.abort()

        this.emit(runId, { type: 'canceled', runId })

        setTimeout(() => this.runs.delete(runId), 60_000)

        return true
    }

    subscribe(runId: string, fn: Listener) {
        const set = this.listeners.get(runId) ?? new Set<Listener>()
        set.add(fn)

        this.listeners.set(runId, set)

        return () => {
            set.delete(fn)
            if (set.size === 0) this.listeners.delete(runId)
        }
    }

    private emit(runId: string, event: RunEvent) {
        const set = this.listeners.get(runId)
        if (!set) return
        for (const fn of set) fn(event)
    }
}
