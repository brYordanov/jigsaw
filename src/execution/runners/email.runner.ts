import { renderTemplate } from '../../modules/email/renderer'
import { mailer } from '../../modules/email/transport'
import { EmailConfigDto } from '../../modules/jobs/dtos/email-config.dto'

export const runEmailJob = async (config: EmailConfigDto, signal?: AbortSignal): Promise<any> => {
    const { template, variables, subject, to } = config
    const { text } = renderTemplate(template, variables)
    try {
        const sendInfo = await mailer.sendMail({
            from: 'info@bigtilt.org',
            to,
            subject,
            text,
        })

        return { ok: true, messageId: sendInfo.messageId }
    } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e) }
    }
}
