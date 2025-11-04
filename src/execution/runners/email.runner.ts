import { EmailConfigDto } from '../../modules/jobs/job.dtos'

export const runEmailJob = async (config: EmailConfigDto, signal?: AbortSignal): Promise<any> => {
    const { template, variables, subject, to } = config

    return {
        ok: true,
        status: 200,
        statusText: 'damn',
        body: template,
    }
}
