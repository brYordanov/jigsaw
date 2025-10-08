export class ItemSelect {
    constructor(container) {
        this.container = container
        this.tables = this.container.querySelectorAll('[data-func="table"]')
        this.controlsContainer = this.container.querySelector('[data-func="control-container"]')
        this.controls = getControlsByRole(this.controlsContainer)
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
        if (!this.selectedRow) throw new Error('no selected row found')
        const currTable = this.selectedRow.closest('[data-func="table"]')
        if (!currTable) throw new Error('table not found')

        const { left, right, up, down } = this.controls
        Object.values(this.controls).forEach(control => setDisabled(control, true))

        const currTableRole = currTable.dataset.role

        if (currTableRole === 'available') {
            setDisabled(left, false)
            return
        }

        if (currTableRole !== 'selected') return

        const allRows = [...currTable.querySelectorAll('[data-func="row"]')]
        const rowCount = allRows.length
        const selectedRowIndex = allRows.indexOf(this.selectedRow)

        setDisabled(right, false)

        if (rowCount === 1) return

        const isFirst = selectedRowIndex === 0
        const isLast = selectedRowIndex === rowCount - 1
        if (!isLast) setDisabled(down, false)
        if (!isFirst) setDisabled(up, false)
    }

    initEvents = () => {
        this.tables.forEach(table => table.addEventListener('click', this.targetRow))
    }

    init = () => {
        this.container.dataset.init = 'true'
        this.initEvents()
    }
}

const getControlsByRole = root =>
    Object.fromEntries([...root.querySelectorAll('[data-role]')].map(el => [el.dataset.role, el]))

const setDisabled = (el, disabled = true) => el && el.classList.toggle('disabled', disabled)
