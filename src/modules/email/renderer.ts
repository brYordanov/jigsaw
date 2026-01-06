export const renderTemplate = (template: string, variables: Record<string, any>) => {
    const render = (string: string) =>
        string.replace(/\{\{(\w+)\}\}/g, (_, keyword) => {
            return String(variables[keyword] ?? '')
        })
    const html = render(template)
    const text = html.replace(/<[^>]+>/g, '')
    return { html, text }
}
