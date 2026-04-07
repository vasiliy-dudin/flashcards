/** Formats a YYYY-MM-DD date string as "15 Apr '26" (en-GB locale). */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}
