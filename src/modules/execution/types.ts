import { EmailConfigDto } from '../jobs/dtos/email-config.dto'
import { HealthcheckConfigDto } from '../jobs/dtos/healthcheck-config.dto'
import { HttpConfigDto } from '../jobs/dtos/http-config.dto'
import { ShellConfigDto } from '../jobs/dtos/shell-config.dto'

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    shell: (config: ShellConfigDto, signal?: AbortSignal) => Promise<any>
    email: (config: EmailConfigDto) => Promise<any>
    healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}

type AttemptStatus = 'ok' | 'failed' | 'aborted'

export interface RunAttemptLog {
    attempt: number
    status: AttemptStatus
    result?: Record<string, unknown>
    error?: string
    aborted?: boolean
}
