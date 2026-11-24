import Link from 'next/link'
import { PageHeader, Table } from '@/components/ui'
import { saveStaff } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ugx } from '@/lib/format'
import { canSeePay, canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Staff' }

export default async function StaffPage() {
  const user = await guard('staff')
  const rows = all<any>(getDb(), `select s.*, m.first_name || ' ' || m.last_name as manager
    from staff s left join staff m on m.id = s.reports_to order by s.employee_no`)
  const showPay = canSeePay(user.role)
  return (
    <div>
      <PageHeader eyebrow="People" title="Staff" lede="Biodata, employment, contact, location, position, and additional information such as disability status." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'employee_no', label: 'No.', render: (row) => <Link className="font-semibold text-leaf" href={`/staff/${row.id}`}>{row.employee_no}</Link> },
          { key: 'name', label: 'Name', render: (row) => `${row.first_name} ${row.last_name}` },
          { key: 'position', label: 'Position' },
          { key: 'department', label: 'Department' },
          { key: 'phone', label: 'Phone' },
          { key: 'village', label: 'Village' },
          ...(showPay ? [{ key: 'pay', label: 'Monthly pay', align: 'right' as const, render: (row: any) => ugx(row.basic_salary + row.allowances) }] : []),
          { key: 'pwd', label: 'PWD', render: (row) => row.pwd ? 'Yes' : 'No' },
          { key: 'status', label: 'Status' },
        ]} />
      </div>
      {canWrite(user.role, 'staff') ? (
        <details className="card details mt-4">
          <summary>Add a staff member</summary>
          <form action={saveStaff} className="form-grid">
            <label className="field"><span>First name</span><input name="first_name" required /></label>
            <label className="field"><span>Last name</span><input name="last_name" required /></label>
            <label className="field"><span>Gender</span><select name="gender"><option>Female</option><option>Male</option></select></label>
            <label className="field"><span>Date of birth</span><input type="date" name="dob" /></label>
            <label className="field"><span>Phone</span><input name="phone" /></label>
            <label className="field"><span>Email</span><input name="email" type="email" /></label>
            <label className="field"><span>Position</span><input name="position" /></label>
            <label className="field"><span>Department</span><input name="department" /></label>
            <label className="field"><span>Reports to</span><select name="reports_to"><option value="">None</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.first_name} {row.last_name}</option>)}</select></label>
            <label className="field"><span>Hire date</span><input type="date" name="hire_date" /></label>
            <label className="field"><span>Contract</span><select name="contract_type"><option>Permanent</option><option>Fixed term</option><option>Casual</option></select></label>
            <label className="field"><span>Village</span><input name="village" /></label>
            <label className="field"><span>Basic salary</span><input name="basic_salary" inputMode="decimal" defaultValue="0" /></label>
            <label className="field"><span>Allowances</span><input name="allowances" inputMode="decimal" defaultValue="0" /></label>
            <label className="field"><span>Next of kin</span><input name="next_of_kin" /></label>
            <label className="field"><span>Kin phone</span><input name="next_of_kin_phone" /></label>
            <label className="check field"><input type="checkbox" name="pwd" /> Person with a disability</label>
            <label className="field wide"><span>Disability note</span><input name="pwd_notes" /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save staff</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
