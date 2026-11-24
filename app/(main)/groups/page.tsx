import Link from 'next/link'
import { PageHeader, Table } from '@/components/ui'
import { saveGroup } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const user = await guard('groups')
  const rows = all<any>(getDb(), `select g.*, (select count(*) from farmers f where f.group_id = g.id) as members from groups g order by g.name`)
  return (
    <div>
      <PageHeader eyebrow="People" title="Groups" lede="Producer groups that members belong to, with a leader and where they meet." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Group' },
          { key: 'village', label: 'Village' },
          { key: 'leader_name', label: 'Leader' },
          { key: 'members', label: 'Members', render: (row) => <Link className="font-semibold text-leaf" href={`/farmers?group=${row.code}`}>{row.members}</Link> },
          { key: 'formed_on', label: 'Formed', render: (row) => prettyDate(row.formed_on) },
        ]} />
      </div>
      {canWrite(user.role, 'groups') ? (
        <details className="card details mt-4">
          <summary>Add a group</summary>
          <form action={saveGroup} className="form-grid">
            <label className="field"><span>Code</span><input name="code" required /></label>
            <label className="field"><span>Name</span><input name="name" required /></label>
            <label className="field"><span>Leader</span><input name="leader_name" /></label>
            <label className="field"><span>Phone</span><input name="phone" /></label>
            <label className="field"><span>District</span><input name="district" defaultValue="Kasese" /></label>
            <label className="field"><span>Subcounty</span><input name="subcounty" /></label>
            <label className="field"><span>Village</span><input name="village" /></label>
            <label className="field"><span>Formed</span><input type="date" name="formed_on" /></label>
            <label className="field full"><span>Notes</span><textarea name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save group</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
