import Link from 'next/link'
import { CollectionForm } from '@/components/forms'
import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { kg, prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Collections' }

export default async function CollectionsPage() {
  const user = await guard('collections')
  const db = getDb()
  const rows = all<any>(db, `select c.*, f.first_name || ' ' || f.last_name as farmer, g.name as group_name, b.name as centre
    from collections c join farmers f on f.id = c.farmer_id
    left join groups g on g.id = c.group_id left join bulking_centres b on b.id = c.centre_id
    order by c.collection_date desc, c.id desc`)
  const farmers = all<any>(db, "select id, farmer_code as code, first_name || ' ' || last_name as name from farmers where status = 'active' order by first_name")
  const gardens = all<any>(db, 'select id, farmer_id, name, produce from gardens order by name')
  const centres = all<any>(db, 'select id, name from bulking_centres order by name')
  const prices = all<any>(db, `select produce, grade, unit_price, default_premium from price_schedules
    where id in (select max(id) from price_schedules group by produce, grade) order by produce, grade`)
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Collections" lede="Each delivery gets a receipt and a trace code. The quality price and premium become the amount owed to the member, and the lot enters stock." />
      {canWrite(user.role, 'collections') ? (
        <details className="card details mb-4" open>
          <summary>Record a delivery</summary>
          <div className="pad"><CollectionForm farmers={farmers} gardens={gardens} centres={centres} prices={prices} /></div>
        </details>
      ) : null}
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'collection_date', label: 'Date', render: (row) => prettyDate(row.collection_date) },
          { key: 'receipt_no', label: 'Receipt' },
          { key: 'trace_code', label: 'Trace', render: (row) => <Link className="font-semibold text-leaf" href={`/trace?code=${row.trace_code}`}>{row.trace_code}</Link> },
          { key: 'farmer', label: 'Farmer' },
          { key: 'group_name', label: 'Group' },
          { key: 'centre', label: 'Centre' },
          { key: 'produce', label: 'Produce', render: (row) => `${row.produce} ${row.grade}` },
          { key: 'volume_kg', label: 'Kg', align: 'right', render: (row) => kg(row.volume_kg, 0) },
          { key: 'gross_amount', label: 'Due', align: 'right', render: (row) => ugx(row.gross_amount) },
          { key: 'payment_status', label: 'Paid' },
        ]} />
      </div>
    </div>
  )
}
