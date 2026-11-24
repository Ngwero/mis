import { ModeSelect, PageHeader, Stat, Table } from '@/components/ui'
import { disburseLoanAction, repayFacilityAction, repayLoanAction, saveLoanProduct } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate, ugx } from '@/lib/format'
import { isoToday } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Credit' }

function loanStatus(row: { outstanding: number; due_on: string | null }) {
  if (Number(row.outstanding) <= 0) return 'closed'
  if (row.due_on && row.due_on < isoToday()) return 'overdue'
  return 'open'
}

export default async function CreditPage() {
  const user = await guard('credit')
  const db = getDb()
  const loans = all<any>(db, `select l.*, f.first_name || ' ' || f.last_name as farmer, p.name as product, fu.name as funder
    from loans l join farmers f on f.id = l.farmer_id
    left join loan_products p on p.id = l.product_id left join funders fu on fu.id = p.funder_id
    order by l.disbursed_on desc`)
  const facilities = all<any>(db, `select fa.*, fu.name as funder from facilities fa left join funders fu on fu.id = fa.funder_id`)
  const products = all<any>(db, 'select * from loan_products order by name')
  const funders = all<any>(db, 'select * from funders order by name')
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers order by first_name")
  const interestIn = get<any>(db, 'select coalesce(sum(interest_received),0) as s from loans')
  const interestOut = get<any>(db, 'select coalesce(sum(interest_paid),0) as s from facilities')
  const outstanding = loans.reduce((sum, row) => sum + Number(row.outstanding), 0)
  const writable = canWrite(user.role, 'credit')
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Credit" lede="Facilities the cooperative has borrowed, products offered to smallholders, and the interest received or paid. Interest is recognised when a repayment is posted." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding to members" value={ugx(outstanding)} />
        <Stat label="Interest received" value={ugx(interestIn.s)} />
        <Stat label="Interest paid on facilities" value={ugx(interestOut.s)} hint={`Spread ${ugx(interestIn.s - interestOut.s)}`} />
      </div>
      <section className="card">
        <h2 className="section-title px-4 pt-4">Borrowed facilities</h2>
        <Table rows={facilities} columns={[
          { key: 'code', label: 'Code' },
          { key: 'funder', label: 'Provider' },
          { key: 'name', label: 'Facility' },
          { key: 'principal', label: 'Principal', align: 'right', render: (row) => ugx(row.principal) },
          { key: 'outstanding', label: 'Outstanding', align: 'right', render: (row) => ugx(row.outstanding) },
          { key: 'interest_rate', label: 'Rate', align: 'right', render: (row) => `${row.interest_rate}%` },
          { key: 'due_on', label: 'Due', render: (row) => prettyDate(row.due_on) },
        ]} />
      </section>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Loans to smallholders</h2>
        <Table rows={loans} columns={[
          { key: 'code', label: 'Code' },
          { key: 'farmer', label: 'Beneficiary' },
          { key: 'product', label: 'Product' },
          { key: 'funder', label: 'Source' },
          { key: 'principal', label: 'Principal', align: 'right', render: (row) => ugx(row.principal) },
          { key: 'outstanding', label: 'Outstanding', align: 'right', render: (row) => ugx(row.outstanding) },
          { key: 'interest_received', label: 'Interest', align: 'right', render: (row) => ugx(row.interest_received) },
          { key: 'status', label: 'Status', render: (row) => loanStatus(row) },
        ]} />
      </section>
      {writable ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form action={disburseLoanAction} className="card form-grid p-4">
            <h2 className="section-title field full">Disburse a product</h2>
            <label className="field"><span>Product</span><select name="product_id" required>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.interest_rate}%</option>)}</select></label>
            <label className="field"><span>Member</span><select name="farmer_id" required><option value="">Choose</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label className="field"><span>Principal</span><input name="principal" required /></label>
            <label className="field"><span>Pay from</span><ModeSelect name="pay_from" /></label>
            <label className="field"><span>Date</span><input type="date" name="disbursed_on" required /></label>
            <label className="field"><span>Due</span><input type="date" name="due_on" /></label>
            <label className="field full"><span>Purpose</span><input name="purpose" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Disburse</button></div>
          </form>
          <form action={repayLoanAction} className="card form-grid p-4">
            <h2 className="section-title field full">Member repayment</h2>
            <label className="field wide"><span>Loan</span><select name="loan_id" required>{loans.filter((loan) => loan.outstanding > 0).map((loan) => <option key={loan.id} value={loan.id}>{loan.code} · {loan.farmer} · {ugx(loan.outstanding)}</option>)}</select></label>
            <label className="field"><span>Date</span><input type="date" name="payment_date" required /></label>
            <label className="field"><span>Principal</span><input name="principal" defaultValue="0" /></label>
            <label className="field"><span>Interest</span><input name="interest" defaultValue="0" /></label>
            <label className="field"><span>Received as</span><ModeSelect /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Post repayment</button></div>
          </form>
          <form action={repayFacilityAction} className="card form-grid p-4">
            <h2 className="section-title field full">Facility repayment</h2>
            <label className="field wide"><span>Facility</span><select name="facility_id">{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.code} · {ugx(facility.outstanding)} outstanding</option>)}</select></label>
            <label className="field"><span>Date</span><input type="date" name="payment_date" required /></label>
            <label className="field"><span>Principal</span><input name="principal" defaultValue="0" /></label>
            <label className="field"><span>Interest</span><input name="interest" defaultValue="0" /></label>
            <label className="field"><span>Paid from</span><ModeSelect /></label>
            <div className="field"><button className="btn btn-ghost" type="submit">Post facility repayment</button></div>
          </form>
          <form action={saveLoanProduct} className="card form-grid p-4">
            <h2 className="section-title field full">New product for smallholders</h2>
            <label className="field"><span>Name</span><input name="name" required /></label>
            <label className="field"><span>Provider</span><select name="funder_id"><option value="">None</option>{funders.map((funder) => <option key={funder.id} value={funder.id}>{funder.name}</option>)}</select></label>
            <label className="field"><span>Book</span><select name="book"><option value="member">Member loan</option><option value="input">Input loan</option></select></label>
            <label className="field"><span>Interest %</span><input name="interest_rate" defaultValue="0" /></label>
            <label className="field"><span>Term (months)</span><input name="term_months" /></label>
            <label className="field"><span>Maximum</span><input name="max_amount" /></label>
            <label className="field full"><span>Notes</span><input name="notes" /></label>
            <div className="field"><button className="btn btn-ghost" type="submit">Save product</button></div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
