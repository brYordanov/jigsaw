export class ThemeSwitch {
    constructor(container) {
        this.container = container
        this.input = this.container.querySelector('[data-func="input"]')

        if (!this.input) throw new Error('input missing')
        this.init()
    }

    static setThemeCookie(theme) {
        const days = 365
        const date = new Date()
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
        document.cookie = `theme=${theme}; expires=${date.toUTCString}; path=/`
    }

    init() {
        this.input.addEventListener('change', e => {
            const theme = e.currentTarget.checked ? 'light' : 'dark'
            document.body.dataset.theme = theme
            ThemeSwitch.setThemeCookie(theme)
        })
    }
}
