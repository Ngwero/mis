import Link from 'next/link'
import { PageHeader, Table } from '@/components/ui'
import { saveFarmer } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ageOn } from '@/lib/format'
import { one } from '@/lib/form'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Farmers' }

export default async function FarmersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await guard('farmers')
  const sp = await searchParams
  const q = one(sp.q)
  const group = one(sp.group)
  const db = getDb()
  const groups = all<any>(db, 'select id, code, name from groups order by name')
  const rows = all<any>(db, `select f.*, g.name as group_name, coalesce(u.name, f.recorded_by_name) as recorded_by
    from farmers f left join groups g on g.id = f.group_id left join users u on u.id = f.added_by
    where (? = '' or g.code = ?)
      and (? = '' or f.first_name || ' ' || f.last_name || ' ' || f.farmer_code || ' ' || ifnull(f.phone,'') like ?)
    order by f.farmer_code`, group, group, q, `%${q}%`)
  return (
    <div>
      <PageHeader eyebrow="People" title="Farmers" lede="Biodata, group, consent, and the staff member who recorded the file." />
      <form className="card mb-4 flex flex-wrap gap-2 p-3 no-print" method="get">
        <input name="q" defaultValue={q} placeholder="Name, code, or phone" className="max-w-xs" />
        <select name="group" defaultValue={group}>
          <option value="">All groups</option>
          {groups.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
        </select>
        <button className="btn btn-ghost" type="submit">Filter</button>
      </form>
      <div className="card">
        <Table
          rows={rows}
          columns={[
            { key: 'farmer_code', label: 'Code', render: (row) => <Link className="font-semibold text-leaf" href={`/farmers/${row.id}`}>{row.farmer_code}</Link> },
            { key: 'name', label: 'Name', render: (row) => `${row.first_name} ${row.last_name}` },
            { key: 'gender', label: 'Gender' },
            { key: 'age', label: 'Age', render: (row) => ageOn(row.dob) ?? '—' },
            { key: 'group_name', label: 'Group' },
            { key: 'village', label: 'Village' },
            { key: 'phone', label: 'Phone' },
            { key: 'recorded_by', label: 'Recorded by' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>
      {canWrite(user.role, 'farmers') ? (
        <details className="card details mt-4 no-print">
          <summary>Add a member</summary>
          <form action={saveFarmer} className="form-grid">
            <label className="field"><span>First name</span><input name="first_name" required /></label>
            <label className="field"><span>Last name</span><input name="last_name" required /></label>
            <label className="field"><span>Gender</span><select name="gender"><option>Female</option><option>Male</option><option>Other</option></select></label>
            <label className="field"><span>Date of birth</span><input type="date" name="dob" /></label>
            <label className="field"><span>Phone</span><input name="phone" /></label>
            <label className="field"><span>National ID</span><input name="national_id" /></label>
            <label className="field"><span>Group</span><select name="group_id"><option value="">None</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Village</span><input name="village" /></label>
            <label className="field"><span>District</span><input name="district" defaultValue="Kasese" /></label>
            <label className="field"><span>Subcounty</span><input name="subcounty" /></label>
            <label className="field"><span>Main enterprise</span><input name="main_enterprise" /></label>
            <label className="field"><span>Membership date</span><input type="date" name="membership_date" /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" /></label>
            <p className="field full muted text-sm">Tick only what the member has agreed to. Record the details the cooperative needs for membership, produce, and agreed services.</p>
            <label className="check field"><input type="checkbox" name="consent_store" /> May store this membership record</label>
            <label className="check field"><input type="checkbox" name="consent_sms" /> May send SMS</label>
            <label className="check field"><input type="checkbox" name="pwd" /> Person with a disability</label>
            <label className="field wide"><span>Disability note</span><input name="pwd_notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save member</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
