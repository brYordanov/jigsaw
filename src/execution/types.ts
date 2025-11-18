import { EmailConfigDto, HttpConfigDto, ShellConfigDto } from '../modules/jobs/dtos/module.dtos'

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    email: (config: EmailConfigDto) => Promise<any>
    shell: (config: ShellConfigDto) => Promise<any>
    // healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}
