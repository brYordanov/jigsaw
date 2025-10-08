const TableRoles = Object.freeze({
    SELECTED: 'selected',
    AVAILIABLE: 'availiable',
})

const controlStatesMap = Object.freeze({
    availiable: ['left'],
    selected: ['up', 'down', 'right'],
})

export class ItemSelect {
    constructor(container) {
        this.container = container
        this.tables = this.container.querySelectorAll('[data-func="table"]')
        this.controls = this.container.querySelectorAll('[data-func="control')
        this.selectedRow = this.container.querySelector('.selected[data-func="row"]')
        this.init()
    }

    targetRow = e => {
        const row = e.target.closest('[data-func="row"]')
        if (!row) return
        this.container
            .querySelectorAll('[data-func="row"]')
            .forEach(row => row.classList.remove('selected'))
        row.classList.add('selected')
        this.selectedRow = row
        this.manageControlsState()
    }

    manageControlsState() {
        const currTable = this.selectedRow.closest('[data-func="table"]')
        this.controls.forEach(control => control.classList.add('disabled'))
        const selectors = controlStatesMap[currTable.dataset.role]
        selectors.forEach(selector => {
            const control = this.container.querySelector(`[data-role="${selector}"]`)
            control.classList.remove('disabled')
        })
    }

    initEvents = () => {
        this.tables.forEach(table => table.addEventListener('click', this.targetRow))
    }

    init = () => {
        this.container.dataset.init = 'true'
        this.initEvents()
    }
}
