export interface MochiImportResult {
  imported: number
  skipped: number
}

/** POSTs a ZIP/mochi file to the import endpoint and returns the result counts. */
export async function importMochiFile(file: File): Promise<MochiImportResult> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/import/mochi', { method: 'POST', body })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Import failed: ${res.status}`)
  }
  return res.json() as Promise<MochiImportResult>
}
