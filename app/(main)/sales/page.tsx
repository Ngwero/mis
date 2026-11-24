import { SaleForm } from '@/components/forms'
import { ModeSelect, PageHeader, Table } from '@/components/ui'
import { receiveSaleAction } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { kg, prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Sales' }

export default async function SalesPage() {
  const user = await guard('sales')
  const db = getDb()
  const rows = all<any>(db, `select s.*, f.first_name || ' ' || f.last_name as farmer
    from sales s left join farmers f on f.id = s.farmer_id order by s.sale_date desc`)
  const batches = all<any>(db, 'select id, trace_code, produce, state, qty, location from batches where qty > 0.001 order by received_on desc')
  const farmers = all<any>(db, "select id, farmer_code as code, first_name || ' ' || last_name as name from farmers order by first_name")
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Produce sales" lede="Sell a batch in bulk, or tag the sale to one member. The member is still paid through Farmer payments at the quality price." />
      {canWrite(user.role, 'sales') ? (
        <details className="card details mb-4">
          <summary>Record a sale</summary>
          <div className="pad"><SaleForm batches={batches} farmers={farmers} /></div>
        </details>
      ) : null}
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'sale_date', label: 'Date', render: (row) => prettyDate(row.sale_date) },
          { key: 'sale_no', label: 'Sale' },
          { key: 'buyer_name', label: 'Buyer' },
          { key: 'farmer', label: 'Farmer lot', render: (row) => row.farmer || 'Bulk' },
          { key: 'trace_code', label: 'Trace' },
          { key: 'state', label: 'State' },
          { key: 'qty', label: 'Kg', align: 'right', render: (row) => kg(row.qty, 0) },
          { key: 'total_amount', label: 'Amount', align: 'right', render: (row) => ugx(row.total_amount) },
          { key: 'payment_status', label: 'Paid' },
          { key: 'receive', label: '', render: (row) => row.payment_status === 'unpaid' && canWrite(user.role, 'sales') ? (
            <form action={receiveSaleAction} className="flex gap-2">
              <input type="hidden" name="sale_id" value={row.id} />
              <input type="date" name="date" required className="max-w-[140px]" />
              <ModeSelect />
              <button className="btn btn-ghost" type="submit">Receive</button>
            </form>
          ) : null },
        ]} />
      </div>
    </div>
  )
}
