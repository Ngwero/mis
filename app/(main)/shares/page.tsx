import { PageHeader, Stat, Table } from '@/components/ui'
import { saveShare } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'
import { ModeSelect } from '@/components/ui'

export const metadata = { title: 'Shares' }

export default async function SharesPage() {
  const user = await guard('shares')
  const db = getDb()
  const rows = all<any>(db, `select s.*, f.first_name || ' ' || f.last_name as name, g.name as group_name
    from shares s join farmers f on f.id = s.farmer_id left join groups g on g.id = f.group_id order by s.certificate_no`)
  const totals = get<any>(db, `select coalesce(sum(amount_paid),0) as paid, coalesce(sum(share_count * nominal_value - amount_paid),0) as unpaid, count(distinct farmer_id) as members from shares`)
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers where status = 'active' order by first_name")
  return (
    <div>
      <PageHeader eyebrow="People" title="Shares" lede="Paid-up capital is in the ledger. An unpaid call is shown on the certificate and is not treated as cash until it is received." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Members with shares" value={String(totals.members)} />
        <Stat label="Paid-up capital" value={ugx(totals.paid)} />
        <Stat label="Calls in arrears" value={ugx(totals.unpaid)} />
      </div>
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'certificate_no', label: 'Certificate' },
          { key: 'name', label: 'Member' },
          { key: 'group_name', label: 'Group' },
          { key: 'share_count', label: 'Shares', align: 'right' },
          { key: 'amount_paid', label: 'Paid', align: 'right', render: (row) => ugx(row.amount_paid) },
          { key: 'unpaid', label: 'Unpaid', align: 'right', render: (row) => ugx(row.share_count * row.nominal_value - row.amount_paid) },
          { key: 'issued_on', label: 'Issued', render: (row) => prettyDate(row.issued_on) },
        ]} />
      </div>
      {canWrite(user.role, 'shares') ? (
        <details className="card details mt-4">
          <summary>Issue shares</summary>
          <form action={saveShare} className="form-grid">
            <label className="field"><span>Member</span><select name="farmer_id" required><option value="">Choose</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label className="field"><span>Class</span><input name="class_name" defaultValue="Ordinary" /></label>
            <label className="field"><span>Number of shares</span><input name="share_count" required /></label>
            <label className="field"><span>Nominal value each</span><input name="nominal_value" defaultValue="100000" /></label>
            <label className="field"><span>Amount paid now</span><input name="amount_paid" required /></label>
            <label className="field"><span>Received as</span><ModeSelect name="pay_mode" /></label>
            <label className="field"><span>Date</span><input type="date" name="issued_on" required /></label>
            <label className="field wide"><span>Notes</span><input name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Post share capital</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
