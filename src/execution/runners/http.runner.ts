import { HttpConfigDto } from '../../modules/jobs/job.dtos'

export const runHttpJob = async (config: HttpConfigDto, signal?: AbortSignal): Promise<any> => {
    const { url, method = 'GET', headers, body } = config
    if (!url) throw new Error('HTTP job missing url')

    const response = await fetch(url, { method, headers, body, signal })
    const text = await response.text()

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: text,
    }
}
