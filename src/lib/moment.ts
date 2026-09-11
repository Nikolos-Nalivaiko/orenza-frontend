const dayShort = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' })
const dayFull = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const clock = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })

function isDay(at: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(at)
}

function parseMoment(at: string): Date | null {
  const date = new Date(isDay(at) ? `${at}T12:00:00Z` : at)

  return Number.isNaN(date.getTime()) ? null : date
}

export function momentTime(at: string): number {
  return parseMoment(at)?.getTime() ?? 0
}

export function formatMomentDay(at: string, today: string): string {
  const date = parseMoment(at)

  if (date === null) {
    return ''
  }

  return at.slice(0, 4) === today.slice(0, 4) ? dayShort.format(date) : dayFull.format(date)
}

export function formatMomentTime(at: string): string {
  const date = parseMoment(at)

  return date === null || isDay(at) ? '' : clock.format(date)
}
