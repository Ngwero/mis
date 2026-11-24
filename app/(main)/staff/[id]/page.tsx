import { notFound } from 'next/navigation'
import { PageHeader, Table } from '@/components/ui'
import { saveStaff } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate, ugx } from '@/lib/format'
import { canSeePay, canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Staff member' }

export default async function StaffDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await guard('staff')
  const { id } = await params
  const db = getDb()
  const person = get<any>(db, `select s.*, m.first_name || ' ' || m.last_name as manager from staff s left join staff m on m.id = s.reports_to where s.id = ?`, id)
  if (!person) notFound()
  const payroll = all<any>(db, 'select * from payroll where staff_id = ? order by period desc', id)
  const managers = all<any>(db, 'select id, first_name, last_name from staff where id != ? order by first_name', id)
  const showPay = canSeePay(user.role)
  return (
    <div>
      <PageHeader eyebrow={person.employee_no} title={`${person.first_name} ${person.last_name}`} lede={`${person.position || 'Staff'} · ${person.department || ''}`} />
      <section className="card p-5">
        <dl className="kv">
          <dt>Gender / birth</dt><dd>{person.gender || '—'} · {prettyDate(person.dob)}</dd>
          <dt>National ID</dt><dd>{person.national_id || '—'}</dd>
          <dt>Phone / email</dt><dd>{person.phone || '—'} · {person.email || '—'}</dd>
          <dt>Next of kin</dt><dd>{person.next_of_kin || '—'} · {person.next_of_kin_phone || ''}</dd>
          <dt>Location</dt><dd>{[person.village, person.subcounty, person.district, person.address].filter(Boolean).join(', ') || '—'}</dd>
          <dt>Employment</dt><dd>{person.contract_type || '—'} from {prettyDate(person.hire_date)}. Reports to {person.manager || 'nobody'}.</dd>
          {showPay ? <><dt>Salary</dt><dd>{ugx(person.basic_salary)} basic + {ugx(person.allowances)} allowances</dd></> : null}
          <dt>Disability</dt><dd>{person.pwd ? person.pwd_notes || 'Yes' : 'No'}</dd>
          <dt>Notes</dt><dd>{person.notes || '—'}</dd>
        </dl>
      </section>
      {showPay ? (
        <section className="card mt-4">
          <h2 className="section-title px-4 pt-4">Payroll</h2>
          <Table rows={payroll} columns={[
            { key: 'period', label: 'Period' },
            { key: 'basic', label: 'Basic', align: 'right', render: (row) => ugx(row.basic) },
            { key: 'allowances', label: 'Allowances', align: 'right', render: (row) => ugx(row.allowances) },
            { key: 'paye', label: 'PAYE', align: 'right', render: (row) => ugx(row.paye) },
            { key: 'net_pay', label: 'Net', align: 'right', render: (row) => ugx(row.net_pay) },
          ]} />
        </section>
      ) : null}
      {canWrite(user.role, 'staff') ? (
        <details className="card details mt-4">
          <summary>Update employment record</summary>
          <form action={saveStaff} className="form-grid">
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="employee_no" value={person.employee_no} />
            <label className="field"><span>First name</span><input name="first_name" defaultValue={person.first_name} required /></label>
            <label className="field"><span>Last name</span><input name="last_name" defaultValue={person.last_name} required /></label>
            <label className="field"><span>Gender</span><input name="gender" defaultValue={person.gender || ''} /></label>
            <label className="field"><span>Date of birth</span><input type="date" name="dob" defaultValue={person.dob || ''} /></label>
            <label className="field"><span>Phone</span><input name="phone" defaultValue={person.phone || ''} /></label>
            <label className="field"><span>Email</span><input name="email" defaultValue={person.email || ''} /></label>
            <label className="field"><span>National ID</span><input name="national_id" defaultValue={person.national_id || ''} /></label>
            <label className="field"><span>Position</span><input name="position" defaultValue={person.position || ''} /></label>
            <label className="field"><span>Department</span><input name="department" defaultValue={person.department || ''} /></label>
            <label className="field"><span>Reports to</span><select name="reports_to" defaultValue={person.reports_to || ''}><option value="">None</option>{managers.map((row) => <option key={row.id} value={row.id}>{row.first_name} {row.last_name}</option>)}</select></label>
            <label className="field"><span>Hire date</span><input type="date" name="hire_date" defaultValue={person.hire_date || ''} /></label>
            <label className="field"><span>Contract</span><input name="contract_type" defaultValue={person.contract_type || ''} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={person.status}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label className="field"><span>District</span><input name="district" defaultValue={person.district || ''} /></label>
            <label className="field"><span>Subcounty</span><input name="subcounty" defaultValue={person.subcounty || ''} /></label>
            <label className="field"><span>Village</span><input name="village" defaultValue={person.village || ''} /></label>
            <label className="field"><span>Address</span><input name="address" defaultValue={person.address || ''} /></label>
            <label className="field"><span>Next of kin</span><input name="next_of_kin" defaultValue={person.next_of_kin || ''} /></label>
            <label className="field"><span>Kin phone</span><input name="next_of_kin_phone" defaultValue={person.next_of_kin_phone || ''} /></label>
            {showPay ? <>
              <label className="field"><span>Basic salary</span><input name="basic_salary" defaultValue={person.basic_salary} /></label>
              <label className="field"><span>Allowances</span><input name="allowances" defaultValue={person.allowances} /></label>
            </> : <>
              <input type="hidden" name="basic_salary" value={person.basic_salary} />
              <input type="hidden" name="allowances" value={person.allowances} />
            </>}
            <label className="check field"><input type="checkbox" name="pwd" defaultChecked={!!person.pwd} /> Person with a disability</label>
            <label className="field wide"><span>Disability note</span><input name="pwd_notes" defaultValue={person.pwd_notes || ''} /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" defaultValue={person.notes || ''} /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save changes</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
