import Link from 'next/link'
import { prettyDate, ugx, kg } from '@/lib/format'
import type { ReportColumn } from '@/lib/reports'

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string
  title: string
  lede?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="page-kicker">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children ? <div className="no-print flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="card stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }) {
  return <span className={`badge badge-${tone === 'neutral' ? '' : tone}`.trim()}>{children}</span>
}

export function statusTone(status?: string | null): 'ok' | 'warn' | 'bad' | 'neutral' {
  const value = String(status || '').toLowerCase()
  if (['active', 'paid', 'pass', 'recorded', 'open'].includes(value)) return 'ok'
  if (['partial', 'advisory', 'overdue', 'unpaid'].includes(value)) return value === 'unpaid' || value === 'overdue' ? 'bad' : 'warn'
  if (['withdrawn', 'inactive', 'closed'].includes(value)) return 'neutral'
  return 'neutral'
}

export function Table({ columns, rows, empty = 'Nothing recorded yet.' }: {
  columns: { key: string; label: string; align?: 'right'; render?: (row: any) => React.ReactNode }[]
  rows: any[]
  empty?: string
}) {
  if (!rows.length) return <p className="muted px-4 py-8 text-sm">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'num' : ''}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? 'num' : ''}>
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function formatCell(column: ReportColumn, value: unknown) {
  if (value == null || value === '') return '—'
  if (column.format === 'money') return ugx(Number(value))
  if (column.format === 'kg') return kg(Number(value))
  if (column.format === 'date') return prettyDate(String(value))
  return String(value)
}

export function ReportTable({ columns, rows }: { columns: ReportColumn[]; rows: Record<string, unknown>[] }) {
  return (
    <Table
      columns={columns.map((column) => ({
        ...column,
        render: (row) => formatCell(column, row[column.key]),
      }))}
      rows={rows}
    />
  )
}

export function Field({ label, children, hint, wide, full }: {
  label: string
  children: React.ReactNode
  hint?: string
  wide?: boolean
  full?: boolean
}) {
  return (
    <label className={`field${wide ? ' wide' : ''}${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function ModeSelect({ name = 'mode', credit = false }: { name?: string; credit?: boolean }) {
  return (
    <select name={name} defaultValue="mobile_money">
      <option value="cash">Cash</option>
      <option value="mobile_money">Mobile money</option>
      <option value="bank">Bank</option>
      {credit ? <option value="credit">Credit</option> : null}
    </select>
  )
}

export function PersonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-semibold text-leaf underline-offset-2 hover:underline">{children}</Link>
}
