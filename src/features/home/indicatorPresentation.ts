/** Convierte las horas promedio del contrato en una duración legible. */
export function formatIndicatorDuration(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return '—'
  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / 1440)
  const remainingHours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = [
    days ? `${days} d` : '',
    remainingHours ? `${remainingHours} h` : '',
    minutes ? `${minutes} min` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 min'
}
