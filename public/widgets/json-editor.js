export class JsonEditor {
    constructor(container) {
        this.container = container
        this.field = container.querySelector('.js_json_field')
        this.error = container.querySelector('.js_json_error')
        this.ac = new AbortController()

        this.init()
    }

    init() {
        if (!this.field || !this.error) return

        const { signal } = this.ac

        this.field.addEventListener('input', () => this.validate(), { signal })
        this.field.addEventListener('blur', () => this.format(), { signal })

        this.container.dataset.jsonInit = 'true'

        // this.validate();
        // this.format();
    }

    disconnect() {
        this.ac.abort()
    }

    validate() {
        try {
            JSON.parse(this.field.value)
            this.error.textContent = ''
            this.field.setCustomValidity('')
        } catch (e) {
            this.error.textContent = 'Invalid JSON: ' + e.message
            this.field.setCustomValidity('Invalid JSON')
        }
    }

    format() {
        try {
            const obj = JSON.parse(this.field.value)
            this.field.value = JSON.stringify(obj, null, 2)
        } catch {}
    }
}
