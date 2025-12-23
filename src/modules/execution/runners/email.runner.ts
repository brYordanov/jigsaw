import { renderTemplate } from '../../email/renderer'
import { mailer } from '../../email/transport'
import { EmailConfigDto } from '../../jobs/dtos/email-config.dto'

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
