import { IntervalType } from './task.entity'

interface IntervalScheduleInput {
    interval_type: IntervalType
    days_of_month?: number[] | null
    days_of_week?: number[] | null
    hours?: number[] | null
    minutes?: number[] | null
}

function sortUnique(nums: number[] | null | undefined): number[] {
    if (!nums || nums.length === 0) return []
    return Array.from(new Set(nums)).sort((a, b) => a - b)
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function nextHourly(now: Date, minutes: number[]): Date {
    if (minutes.length === 0) {
        throw new Error('Hourly schedule requires minutes')
    }

    const curMin = now.getUTCMinutes()
    const sameHourMin = minutes.find(m => m > curMin)

    if (sameHourMin !== undefined) {
        const d = new Date(now)
        d.setUTCMinutes(sameHourMin, 0, 0)
        return d
    }

    const d = new Date(now)
    d.setUTCHours(d.getUTCHours() + 1)
    d.setUTCMinutes(minutes[0], 0, 0)
    return d
}

function nextDaily(now: Date, hours: number[], minutes: number[]): Date {
    if (hours.length === 0) throw new Error('Daily schedule requires hours')
    if (minutes.length === 0) throw new Error('Daily schedule requires minutes')

    const curHour = now.getUTCHours()
    const curMin = now.getUTCMinutes()

    for (const h of hours) {
        if (h < curHour) continue

        if (h === curHour) {
            const min = minutes.find(m => m > curMin)
            if (min !== undefined) {
                const d = new Date(now)
                d.setUTCHours(h, min, 0, 0)
                return d
            }
        } else {
            const d = new Date(now)
            d.setUTCHours(h, minutes[0], 0, 0)
            return d
        }
    }

    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + 1)
    d.setUTCHours(hours[0], minutes[0], 0, 0)
    return d
}

function nextWeekly(now: Date, daysOfWeek: number[], hours: number[], minutes: number[]): Date {
    if (daysOfWeek.length === 0) throw new Error('Weekly schedule requires days_of_week')
    if (hours.length === 0) throw new Error('Weekly schedule requires hours')
    if (minutes.length === 0) throw new Error('Weekly schedule requires minutes')

    for (let delta = 0; delta < 14; delta++) {
        const candidate = new Date(now)
        candidate.setUTCDate(candidate.getUTCDate() + delta)
        const dow = candidate.getUTCDay()

        if (!daysOfWeek.includes(dow)) continue

        if (delta === 0) {
            const todayCandidate = nextDaily(now, hours, minutes)
            if (todayCandidate > now) return todayCandidate
        } else {
            candidate.setUTCHours(hours[0], minutes[0], 0, 0)
            return candidate
        }
    }

    throw new Error('Could not compute next weekly run')
}

function nextMonthly(now: Date, daysOfMonth: number[], hours: number[], minutes: number[]): Date {
    const dom = daysOfMonth.filter(d => d > 0)
    if (dom.length === 0) throw new Error('Monthly schedule requires days_of_month > 0')
    if (hours.length === 0) throw new Error('Monthly schedule requires hours')
    if (minutes.length === 0) throw new Error('Monthly schedule requires minutes')

    const curYear = now.getUTCFullYear()
    const curMonth = now.getUTCMonth()
    const curDay = now.getUTCDate()

    for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
        const year = curYear + Math.floor((curMonth + monthOffset) / 12)
        const month = (curMonth + monthOffset) % 12
        const maxDay = lastDayOfMonth(year, month)

        for (const day of dom) {
            if (day > maxDay) continue

            const candidate = new Date(Date.UTC(year, month, day))

            if (monthOffset === 0 && day === curDay) {
                const sameDayCandidate = nextDaily(now, hours, minutes)
                if (sameDayCandidate > now) return sameDayCandidate
            } else if (monthOffset === 0 && day < curDay) {
                continue
            } else {
                candidate.setUTCHours(hours[0], minutes[0], 0, 0)
                if (candidate > now) return candidate
            }
        }
    }

    throw new Error('Could not compute next monthly run')
}

export function calculateNextRunAt(now: Date, input: IntervalScheduleInput): Date {
    const { interval_type } = input

    const daysOfMonth = sortUnique(input.days_of_month)
    const daysOfWeek = sortUnique(input.days_of_week)
    const hours = sortUnique(input.hours)
    const minutes = sortUnique(input.minutes)

    switch (interval_type) {
        case 'hourly':
            return nextHourly(now, minutes)
        case 'daily':
            return nextDaily(now, hours, minutes)
        case 'weekly':
            return nextWeekly(now, daysOfWeek, hours, minutes)
        case 'monthly':
            return nextMonthly(now, daysOfMonth, hours, minutes)
        default:
            throw new Error(`Unsupported interval_type: ${interval_type}`)
    }
}
