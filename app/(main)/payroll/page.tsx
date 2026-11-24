import { PageHeader, Table } from '@/components/ui'
import { runPayrollAction } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Payroll' }

export default async function PayrollPage() {
  const user = await guard('payroll')
  const rows = all<any>(getDb(), `select p.*, s.first_name || ' ' || s.last_name as name, s.position
    from payroll p join staff s on s.id = p.staff_id order by p.period desc, s.employee_no`)
  return (
    <div>
      <PageHeader eyebrow="People" title="Payroll" lede="Net pay is basic plus allowances, less illustrative NSSF and PAYE. Confirm current URA bands and NSSF rules before using these figures for remittance." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'period', label: 'Period' },
          { key: 'name', label: 'Staff' },
          { key: 'position', label: 'Position' },
          { key: 'basic', label: 'Basic', align: 'right', render: (row) => ugx(row.basic) },
          { key: 'nssf_employee', label: 'NSSF', align: 'right', render: (row) => ugx(row.nssf_employee) },
          { key: 'paye', label: 'PAYE', align: 'right', render: (row) => ugx(row.paye) },
          { key: 'net_pay', label: 'Net', align: 'right', render: (row) => ugx(row.net_pay) },
        ]} />
      </div>
      {canWrite(user.role, 'payroll') ? (
        <form action={runPayrollAction} className="card mt-4 form-grid p-4">
          <label className="field"><span>Month</span><input name="period" placeholder="2026-11" required defaultValue="2026-11" /></label>
          <label className="field"><span>Pay date</span><input type="date" name="paid_on" required defaultValue="2026-11-30" /></label>
          <div className="field"><button className="btn btn-primary" type="submit">Post payroll from the bank</button></div>
        </form>
      ) : null}
    </div>
  )
}
