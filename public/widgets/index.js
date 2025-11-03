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

function initThemeSwitch() {
    const containers = document.querySelectorAll('.js_theme_switch:not([data-init])')

    if (!containers.length) return

    import('./theme-switch.js').then(({ ThemeSwitch }) => {
        containers.forEach(container => {
            new ThemeSwitch(container)
        })
    })
}

document.addEventListener('DOMContentLoaded', () => {
    initJsonEditors()
    initItemSelect()
    initThemeSwitch()
})
document.addEventListener('htmx:afterSwap', e => initJsonEditors(e.target))
