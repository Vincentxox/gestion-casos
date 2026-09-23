export function formatNumber(value: number) {
  return value.toLocaleString('es-GT')
}

export function formatCurrency(value: number) {
  return value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
