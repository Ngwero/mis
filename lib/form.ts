export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

export function num(fd: FormData, key: string) {
  const value = Number(String(fd.get(key) ?? '').replace(/,/g, ''))
  return Number.isFinite(value) ? value : 0
}

export function intId(fd: FormData, key: string) {
  const value = Number(fd.get(key))
  return Number.isInteger(value) && value > 0 ? value : null
}

export function flag(fd: FormData, key: string) {
  const value = fd.get(key)
  return value === 'on' || value === '1' ? 1 : 0
}

export function dateField(fd: FormData, key: string, label = 'date') {
  const value = str(fd, key)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Enter a valid ${label}.`)
  return value
}

export function optionalDate(fd: FormData, key: string) {
  const value = str(fd, key)
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter dates as YYYY-MM-DD.')
  return value
}

export function backTo(fd: FormData, fallback: string) {
  const value = str(fd, 'return_to')
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('://')) return value.split('?')[0]
  return fallback
}

export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export function parseIdList(value: string) {
  try {
    const parsed = JSON.parse(value || '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0)
  } catch {
    return []
  }
}
