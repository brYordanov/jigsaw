import { EmailConfigDto, HttpConfigDto } from '../modules/jobs/job.dtos'

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    // shell: (config: ShellConfigDto) => Promise<any>
    // sql: (config: SqlConfigDto) => Promise<any>
    email: (config: EmailConfigDto) => Promise<any>
    // healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}
