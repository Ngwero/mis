export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const esc = (value: unknown) => {
    const text = value == null ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = columns.map((column) => esc(column.label)).join(',')
  const body = rows.map((row) => columns.map((column) => esc(row[column.key])).join(',')).join('\n')
  return `${header}\n${body}\n`
}

export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') cell += char
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const header = rows.shift()
  if (!header) return []
  const keys = header.map((item) => item.trim().toLowerCase())
  return rows
    .filter((item) => item.some((value) => value.trim()))
    .map((item) => {
      const record: Record<string, string> = {}
      keys.forEach((key, index) => {
        record[key] = (item[index] ?? '').trim()
      })
      return record
    })
}
