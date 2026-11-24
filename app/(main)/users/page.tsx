import { PageHeader, Table } from '@/components/ui'
import { saveUser, setUserActive } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ROLE_LABEL } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Users and access' }

export default async function UsersPage() {
  const user = await guard('users')
  const rows = all<any>(getDb(), 'select id, name, email, role, active from users order by name')
  const staff = all<any>(getDb(), "select id, first_name || ' ' || last_name as name from staff order by first_name")
  return (
    <div>
      <PageHeader eyebrow="System" title="Users and access" lede="Administrators see everything. Field officers capture members, gardens, training, and deliveries. Finance posts payments, sales, payroll, and the ledger. Viewers can read and export reports." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (row) => ROLE_LABEL[row.role] || row.role },
          { key: 'active', label: 'Status', render: (row) => row.active ? 'Active' : 'Inactive' },
          { key: 'action', label: '', render: (row) => row.id === user.id ? null : (
            <form action={setUserActive}>
              <input type="hidden" name="user_id" value={row.id} />
              <input type="hidden" name="active" value={row.active ? '' : 'on'} />
              <button className="btn btn-ghost" type="submit">{row.active ? 'Deactivate' : 'Activate'}</button>
            </form>
          ) },
        ]} />
      </div>
      <form action={saveUser} className="card mt-4 form-grid p-4">
        <h2 className="section-title field full">New user</h2>
        <label className="field"><span>Name</span><input name="name" required /></label>
        <label className="field"><span>Email</span><input name="email" type="email" required /></label>
        <label className="field"><span>Password</span><input name="password" type="password" minLength={8} required /></label>
        <label className="field"><span>Role</span><select name="role"><option value="manager">Manager</option><option value="field">Field officer</option><option value="finance">Finance officer</option><option value="viewer">Board / partner viewer</option><option value="admin">Administrator</option></select></label>
        <label className="field"><span>Linked staff</span><select name="staff_id"><option value="">None</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <div className="field"><button className="btn btn-primary" type="submit">Create user</button></div>
      </form>
    </div>
  )
}
