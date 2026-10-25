export function formatNumber(value: number) {
  return value.toLocaleString('es-GT')
}

export function plural(count: number, singular: string, pluralForm: string) {
  return count === 1 ? singular : pluralForm
}

export function formatCurrency(value: number) {
  return value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatQuetzales(value: number) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value)
}

const shortMonths = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

export function formatClock(value: string | Date | number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDayLabel(value: string | Date | number, now: Date | number = Date.now()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const today = new Date(now)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  if (day === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    return 'Hoy'
  if (day === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime())
    return 'Ayer'
  if (day === new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime())
    return 'Mañana'
  const shortDate = `${date.getDate()} ${shortMonths[date.getMonth()]}`
  return date.getFullYear() === today.getFullYear()
    ? shortDate
    : `${shortDate} ${date.getFullYear()}`
}

/** Plazo del caso: hora solo en los tres días cercanos; después, fecha corta. */
export function formatCaseDueDate(value: string | Date | number, now: Date | number = Date.now()) {
  const day = formatDayLabel(value, now)
  if (day === 'Fecha no disponible') return day
  return day === 'Hoy' || day === 'Ayer' || day === 'Mañana' ? `${day} ${formatClock(value)}` : day
}

/** Fecha del seguimiento: día relativo y hora, también para eventos de hoy. */
export function formatTrackingMoment(
  value: string | Date | number,
  now: Date | number = Date.now(),
) {
  const day = formatDayLabel(value, now)
  if (day === 'Fecha no disponible') return day
  const clock = formatClock(value)
  return day === 'Hoy' || day === 'Ayer' ? `${day} ${clock}` : `${day} · ${clock}`
}

/** Fecha y hora consistentes según el día local del dispositivo. */
export function formatMoment(value: string | Date | number, now: Date | number = Date.now()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const today = new Date(now)
  const time = formatClock(date)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (day === currentDay) return time
  const previousDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime()
  if (day === previousDay) return `Ayer ${time}`
  const dateLabel = `${date.getDate()} ${shortMonths[date.getMonth()]}`
  return date.getFullYear() === today.getFullYear()
    ? `${dateLabel} · ${time}`
    : `${dateLabel} ${date.getFullYear()}`
}

export function formatRelativeDate(date: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(date).getTime())
  if (!Number.isFinite(elapsed)) return 'Fecha no disponible'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  if (hours < 48) return 'ayer'
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} días`
  return new Date(date).toLocaleDateString('es-GT')
}

/** Fecha breve de la lista, según el día local del dispositivo. */
export function formatCaseCardDate(value: string, now = Date.now()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const today = new Date(now)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (day === currentDay) return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime()
  if (day === yesterday) return 'Ayer'
  const weekday = (today.getDay() + 6) % 7
  const startOfWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - weekday,
  ).getTime()
  if (day >= startOfWeek && day < currentDay) {
    return ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][date.getDay()]!
  }
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  return `${date.getDate()} ${months[date.getMonth()]}${date.getFullYear() === today.getFullYear() ? '' : ` ${date.getFullYear()}`}`
}
