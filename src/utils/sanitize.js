const MAX_LENGTHS = {
  title: 200,
  description: 300,
  notes: 500,
  category: 50,
  date: 10,
  default: 200,
}

// Strips null bytes and enforces max lengths per field name.
// React already escapes output so XSS risk is low,
// but this prevents oversized writes and database pollution.
export function sanitizeData(data) {
  const result = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value
    } else if (typeof value === 'string') {
      const max = MAX_LENGTHS[key] ?? MAX_LENGTHS.default
      result[key] = value.replace(/\0/g, '').trim().slice(0, max)
    } else if (typeof value === 'number') {
      result[key] = isFinite(value) ? value : 0
    } else {
      result[key] = value
    }
  }
  return result
}

export function sanitizeAmount(raw) {
  const n = parseFloat(String(raw).replace(',', '.'))
  if (!isFinite(n) || n <= 0) return null
  return Math.min(n, 999999)
}

export function sanitizeDate(raw) {
  if (typeof raw !== 'string') return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  return raw
}
