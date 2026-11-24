import { ConvertForm } from '@/components/forms'
import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { kg, prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Stock' }

export default async function StockPage() {
  const user = await guard('stock')
  const db = getDb()
  const batches = all<any>(db, 'select * from batches order by received_on desc, id desc')
  const moves = all<any>(db, `select c.conv_date as date, c.process, b.trace_code, c.output_qty, c.process_cost, c.notes
    from conversions c join batches b on b.id = c.output_batch_id order by c.conv_date desc`)
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Stock" lede="Lots stay identifiable through pulping, hulling, roasting, milling, or any other conversion. Value moves with the batch, including processing cost." />
      <div className="card">
        <Table rows={batches.filter((row) => row.qty > 0.001)} columns={[
          { key: 'trace_code', label: 'Trace' },
          { key: 'produce', label: 'Produce' },
          { key: 'state', label: 'State' },
          { key: 'qty', label: 'Kg', align: 'right', render: (row) => kg(row.qty) },
          { key: 'total_cost', label: 'Value', align: 'right', render: (row) => ugx(row.total_cost) },
          { key: 'location', label: 'Location' },
          { key: 'received_on', label: 'Date', render: (row) => prettyDate(row.received_on) },
        ]} />
      </div>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Conversions</h2>
        <Table rows={moves} columns={[
          { key: 'date', label: 'Date', render: (row) => prettyDate(row.date) },
          { key: 'process', label: 'Process' },
          { key: 'trace_code', label: 'Output trace' },
          { key: 'output_qty', label: 'Output kg', align: 'right', render: (row) => kg(row.output_qty) },
          { key: 'process_cost', label: 'Cost', align: 'right', render: (row) => ugx(row.process_cost) },
          { key: 'notes', label: 'Notes' },
        ]} />
      </section>
      {canWrite(user.role, 'stock') ? (
        <details className="card details mt-4">
          <summary>Convert or add value</summary>
          <div className="pad"><ConvertForm batches={batches} /></div>
        </details>
      ) : null}
    </div>
  )
}
