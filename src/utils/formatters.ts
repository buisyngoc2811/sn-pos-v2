const numberFormatter = new Intl.NumberFormat('vi-VN')
const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export function formatVnd(value: number) {
  return vndFormatter.format(Math.round(value))
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '--/--/----'
  try {
    const date = value instanceof Date ? value : new Date(value.includes('T') ? value : `${value}T00:00:00`)
    if (!isNaN(date.getTime())) return dateFormatter.format(date)
  } catch (e) {
    // ignore
  }
  return '--/--/----'
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return '--:--'
  try {
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) return timeFormatter.format(value)
      return '--:--'
    }

    if (typeof value === 'string') {
      if (value.includes('T') || value.includes('-') || value.includes('/')) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) return timeFormatter.format(date)
      } else if (value.includes(':')) {
        const [hour, minute] = value.split(':').map(Number)
        if (!isNaN(hour) && !isNaN(minute)) {
          return timeFormatter.format(new Date(2000, 0, 1, hour, minute))
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return '--:--'
}
