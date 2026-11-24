import { PaymentForm } from '@/components/forms'
import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Farmer payments' }

export default async function PaymentsPage() {
  const user = await guard('payments')
  const db = getDb()
  const rows = all<any>(db, `select p.*, f.first_name || ' ' || f.last_name as farmer, c.receipt_no
    from payments p join farmers f on f.id = p.farmer_id left join collections c on c.id = p.collection_id
    order by p.payment_date desc`)
  const farmers = all<any>(db, "select id, farmer_code as code, first_name || ' ' || last_name as name from farmers order by first_name")
  const collections = all<any>(db, `select id, farmer_id, receipt_no, trace_code, gross_amount - amount_paid as remaining from collections where gross_amount > amount_paid`)
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Farmer payments" lede="Settle a delivery, a prior-season balance, or another amount paid to or received from a member. A sale does not by itself pay the farmer." />
      {canWrite(user.role, 'payments') ? (
        <details className="card details mb-4" open>
          <summary>Record a payment</summary>
          <div className="pad"><PaymentForm farmers={farmers} collections={collections} /></div>
        </details>
      ) : null}
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'payment_date', label: 'Date', render: (row) => prettyDate(row.payment_date) },
          { key: 'payment_no', label: 'Payment' },
          { key: 'farmer', label: 'Farmer' },
          { key: 'applied_to', label: 'Applied to' },
          { key: 'receipt_no', label: 'Receipt' },
          { key: 'mode', label: 'Mode', render: (row) => String(row.mode).replace('_', ' ') },
          { key: 'amount', label: 'Amount', align: 'right', render: (row) => ugx(row.amount) },
        ]} />
      </div>
    </div>
  )
}
