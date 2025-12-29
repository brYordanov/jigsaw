import { promises as fs } from 'fs'
import { join } from 'path'

const templateCache = new Map<string, string>()

export async function getEmailTemplate(name: string): Promise<string> {
    if (templateCache.has(name)) {
        return templateCache.get(name)!
    }

    const filePath = join(__dirname, 'templates', `${name}.html`)
    const content = await fs.readFile(filePath, 'utf8')
    templateCache.set(name, content)
    return content
}
