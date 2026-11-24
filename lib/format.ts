export function sh(value: number | null | undefined) {
  return Math.round(Number(value) || 0)
}

export function ugx(value: number | null | undefined) {
  return `UGX ${sh(value).toLocaleString('en-US')}`
}

export function num(value: number | null | undefined, digits = 0) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function kg(value: number | null | undefined, digits = 1) {
  return `${num(value, digits)} kg`
}

export function prettyDate(iso?: string | null) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ageOn(dob?: string | null, on = new Date()) {
  if (!dob) return null
  const born = new Date(`${dob.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(born.getTime())) return null
  let age = on.getFullYear() - born.getFullYear()
  const month = on.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && on.getDate() < born.getDate())) age -= 1
  return age
}

export function isoToday() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function dayBefore(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function fullName(row: { first_name?: string | null; last_name?: string | null; name?: string | null }) {
  if (row.name) return row.name
  return `${row.first_name || ''} ${row.last_name || ''}`.trim()
}

export function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}
