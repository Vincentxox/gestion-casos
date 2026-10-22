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
