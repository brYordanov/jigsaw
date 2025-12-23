import { EmailConfigDto } from '../modules/jobs/dtos/email-config.dto'
import { HealthcheckConfigDto } from '../modules/jobs/dtos/healthcheck-config.dto'
import { HttpConfigDto } from '../modules/jobs/dtos/http-config.dto'
import { ShellConfigDto } from '../modules/jobs/dtos/shell-config.dto'

export type RunnerMap = {
    http: (config: HttpConfigDto, signal?: AbortSignal) => Promise<any>
    shell: (config: ShellConfigDto, signal?: AbortSignal) => Promise<any>
    email: (config: EmailConfigDto) => Promise<any>
    healthcheck: (config: HealthcheckConfigDto) => Promise<any>
}
