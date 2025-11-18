import { HealthcheckConfigDto } from '../../modules/jobs/dtos/healthcheck-config.dto'

const dataStoreTargets = process.env.DATA_STORE_TARGETS?.split(',')

export const runHealthcheckJob = async (config: HealthcheckConfigDto): Promise<any> => {
    return {
        ok: true,
        data: dataStoreTargets,
    }
}
