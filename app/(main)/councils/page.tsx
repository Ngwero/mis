import { PageHeader } from '@/components/ui'
import { addCouncilMember, saveCouncil } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Councils' }

export default async function CouncilsPage() {
  const user = await guard('councils')
  const db = getDb()
  const councils = all<any>(db, 'select * from councils order by kind, name')
  const members = all<any>(db, 'select * from council_members order by role')
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers order by first_name")
  const writable = canWrite(user.role, 'councils')
  return (
    <div>
      <PageHeader eyebrow="People" title="Youth and women councils" lede="Membership and offices such as chairperson, secretary, and treasurer." />
      <div className="grid gap-4 lg:grid-cols-2">
        {councils.map((council) => (
          <section key={council.id} className="card p-5">
            <p className="page-kicker">{council.kind}</p>
            <h2 className="section-title">{council.name}</h2>
            <p className="muted text-sm">Formed {prettyDate(council.formed_on)}. {council.notes}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {members.filter((member) => member.council_id === council.id).map((member) => (
                <li key={member.id}><strong>{member.role}.</strong> {member.member_name} · {member.gender || '—'} · {member.phone || 'no phone'}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {writable ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form action={saveCouncil} className="card form-grid p-4">
            <h2 className="section-title field full">New council</h2>
            <label className="field"><span>Name</span><input name="name" required /></label>
            <label className="field"><span>Type</span><select name="kind"><option value="youth">Youth</option><option value="women">Women</option></select></label>
            <label className="field"><span>Formed</span><input type="date" name="formed_on" /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save council</button></div>
          </form>
          <form action={addCouncilMember} className="card form-grid p-4">
            <h2 className="section-title field full">Add a member</h2>
            <label className="field"><span>Council</span><select name="council_id">{councils.map((council) => <option key={council.id} value={council.id}>{council.name}</option>)}</select></label>
            <label className="field"><span>Role</span><select name="role"><option>Chairperson</option><option>Vice chairperson</option><option>Secretary</option><option>Treasurer</option><option>Member</option></select></label>
            <label className="field wide"><span>From the farmer list</span><select name="farmer_id"><option value="">Not a registered farmer</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label className="field"><span>Or type a name</span><input name="member_name" /></label>
            <label className="field"><span>Phone</span><input name="phone" /></label>
            <label className="field"><span>Gender</span><input name="gender" /></label>
            <label className="field"><span>Started</span><input type="date" name="started_on" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Add member</button></div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
