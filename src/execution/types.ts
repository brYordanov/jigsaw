import { EmailConfigDto, HttpConfigDto, ShellConfigDto } from '../modules/jobs/job.dtos'

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    email: (config: EmailConfigDto) => Promise<any>
    shell: (config: ShellConfigDto) => Promise<any>
    // sql: (config: SqlConfigDto) => Promise<any>
    // healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}
