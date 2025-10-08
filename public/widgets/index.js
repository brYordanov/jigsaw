function initJsonEditors() {
    const containers = document.querySelectorAll('.js_json_container:not([data-init])')

    if (!containers.length) return

    import('./json-editor.js').then(({ JsonEditor }) => {
        containers.forEach(container => {
            new JsonEditor(container)
        })
    })
}
function initItemSelect() {
    const containers = document.querySelectorAll('.js_item_select:not([data-init])')

    if (!containers.length) return

    import('./item-select.js').then(({ ItemSelect }) => {
        containers.forEach(container => {
            new ItemSelect(container)
        })
    })
}

document.addEventListener('DOMContentLoaded', () => {
    initJsonEditors()
    initItemSelect()
})
document.addEventListener('htmx:afterSwap', e => initJsonEditors(e.target))
