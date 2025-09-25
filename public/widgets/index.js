function initJsonEditors(root = document) {
    const containers = root.querySelectorAll('.js_json_container:not([data-json-init])')

    if (!containers.length) return

    import('./json-editor.js').then(({ JsonEditor }) => {
        containers.forEach(container => {
            new JsonEditor(container)
        })
    })
}

document.addEventListener('DOMContentLoaded', () => initJsonEditors(document))
document.addEventListener('htmx:afterSwap', e => initJsonEditors(e.target))
