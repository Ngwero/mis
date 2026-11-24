import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { all } from '@/lib/sql'

export const metadata = { title: 'Audit log' }

export default async function AuditPage() {
  await guard('audit')
  const rows = all<any>(getDb(), `select a.*, u.name as user_name from audit_log a left join users u on u.id = a.user_id order by a.id desc limit 200`)
  return (
    <div>
      <PageHeader eyebrow="System" title="Audit log" lede="Sign-ins and changes to members, deliveries, payments, stock, and the ledger. Passwords are never written here." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'created_at', label: 'When', render: (row) => String(row.created_at).replace('T', ' ').slice(0, 19) },
          { key: 'user_name', label: 'User' },
          { key: 'action', label: 'Action' },
          { key: 'entity', label: 'Record' },
          { key: 'details', label: 'Detail', render: (row) => <span className="text-xs">{String(row.details || '').slice(0, 180)}</span> },
        ]} />
      </div>
    </div>
  )
}
