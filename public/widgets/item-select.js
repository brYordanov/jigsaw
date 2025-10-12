export class ItemSelect {
    constructor(container) {
        this.container = container
        this.tables = this.container.querySelectorAll('[data-func="table"]')
        this.controlsContainer = this.container.querySelector('[data-func="control-container"]')
        this.controls = getControlsByRole(this.controlsContainer)
        this.selectedRow = this.container.querySelector('.selected[data-func="row"]')
        this.selectedTableBody = this.container.querySelector('[data-role="selected-body"]')
        this.idStoreElement = this.container.querySelector('[data-func="id-store"]')
        this.init()
    }

    updateIdStore = () => {
        const idElements = [...this.selectedTableBody.querySelectorAll('[data-func="id"]')]
        this.idStoreElement.value = idElements.map(el => el.textContent.trim()).join(',')
    }

    targetRow = e => {
        const row = e.target.closest('[data-func="row"]')
        if (!row) return
        this.container
            .querySelectorAll('[data-func="row"]')
            .forEach(row => row.classList.remove('selected'))
        this.selectRow(row)
        this.manageControlsState()
    }

    selectRow = row => {
        row.classList.add('selected')
        this.selectedRow = row
    }

    manageControlsState = () => {
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

    moveSelectedRowToTable = destinationTableRole => {
        if (!this.selectedRow) throw new Error('no selected row found')
        const sourceTable = this.selectedRow.closest('[data-func="table"]')
        const destinationTable = getTableByRole(this.container, destinationTableRole)
        const destinationTableBody = destinationTable.querySelector('tbody')

        if (!sourceTable || !destinationTable) throw new Error('tables not found')

        const clone = this.createClone(this.selectedRow)
        const tranformedRow = this.transformRow(clone, destinationTableBody, destinationTableRole)
        destinationTableBody.appendChild(tranformedRow)
        this.selectedRow.remove()
        this.selectRow(tranformedRow)
        this.manageControlsState()
        this.updatePositions()
    }

    createClone = row => {
        const clone = row.cloneNode(true)
        clone.classList.remove('selected')
        return clone
    }

    transformRow = (row, destinationTableBody, destinationTableRole) => {
        if (destinationTableRole === 'selected') {
            const positionEl = document.createElement('td')
            positionEl.dataset.func = 'position'
            positionEl.textContent = destinationTableBody.children.length + 1
            row.prepend(positionEl)
            return row
        }

        const positionEl = row.querySelector('[data-func="position"]')
        positionEl.remove()
        return row
    }

    updatePositions = () => {
        if (!this.selectedTableBody) throw new Error('tbody not found')

        const allSelectedRows = this.selectedTableBody.querySelectorAll('[data-func="position"]')
        allSelectedRows.forEach((row, index) => {
            row.textContent = index + 1
        })
    }

    moveSelectedRowVertically = moveIndex => {
        if (!this.selectedRow) return
        const table = this.selectedRow.closest('[data-func="table"]')
        if (!table || table.dataset.role !== 'selected') return

        const tBody = table.querySelector('[data-func="tbody"]')
        const rows = [...tBody.querySelectorAll('[data-func="row"]')]
        const currIdx = rows.indexOf(this.selectedRow)
        if (currIdx === -1) return

        const targetIdx = currIdx + moveIndex
        if (targetIdx < 0 || targetIdx >= rows.length) return

        if (moveIndex < 0) {
            tBody.insertBefore(this.selectedRow, rows[currIdx - 1])
        } else {
            const after = rows[currIdx + 1].nextElementSibling
            tBody.insertBefore(this.selectedRow, after)
        }

        this.selectRow(this.selectedRow)
        this.updatePositions()
        this.manageControlsState()
    }

    delegateControlsClick = e => {
        const btn = e.target.closest('button[data-role]')

        if (!btn) return
        switch (btn.dataset.role) {
            case 'left':
                this.moveSelectedRowToTable('selected')
                break
            case 'right':
                this.moveSelectedRowToTable('available')
                break
            case 'up':
                this.moveSelectedRowVertically(-1)
                break
            case 'down':
                this.moveSelectedRowVertically(1)
                break
            default:
                console.err('invalid control')
        }
        this.updateIdStore()
    }

    initEvents = () => {
        this.tables.forEach(table => table.addEventListener('click', this.targetRow))
        this.controlsContainer.addEventListener('click', this.delegateControlsClick)
    }

    init = () => {
        this.container.dataset.init = 'true'
        this.initEvents()
    }
}

const getControlsByRole = root =>
    Object.fromEntries([...root.querySelectorAll('[data-role]')].map(el => [el.dataset.role, el]))

const setDisabled = (el, disabled = true) => el && el.classList.toggle('disabled', disabled)

const getTableByRole = (root, role) =>
    root.querySelector(`[data-func="table"][data-role="${role}"]`)
