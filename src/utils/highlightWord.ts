export interface HighlightSegment {
  text: string
  bold: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function splitHighlight(text: string, word: string): HighlightSegment[] {
  const trimmedWord = word.trim()
  if (!trimmedWord) return [{ text, bold: false }]

  const pattern = new RegExp(`\\b${escapeRegExp(trimmedWord)}\\b`, 'gi')
  const segments: HighlightSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) segments.push({ text: text.slice(lastIndex, index), bold: false })
    segments.push({ text: match[0], bold: true })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), bold: false })

  return segments.length > 0 ? segments : [{ text, bold: false }]
}
