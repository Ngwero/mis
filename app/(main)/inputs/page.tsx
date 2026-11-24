import { ModeSelect, PageHeader, Table } from '@/components/ui'
import { issueInputAction, saveVariety } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Inputs and varieties' }

export default async function InputsPage() {
  const user = await guard('inputs')
  const db = getDb()
  const items = all<any>(db, 'select * from input_items order by name')
  const issues = all<any>(db, `select i.*, f.first_name || ' ' || f.last_name as farmer, it.name as item
    from input_issues i join farmers f on f.id = i.farmer_id left join input_items it on it.id = i.item_id
    order by i.issue_date desc`)
  const varieties = all<any>(db, 'select * from varieties order by produce, name')
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers order by first_name")
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Inputs and varieties" lede="Track seed, fertiliser, and equipment in the store, and issue them as a loan, a grant, equipment, or cash. New varieties stay on the catalogue even after the stock moves." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title px-4 pt-4">Store</h2>
          <Table rows={items} columns={[
            { key: 'name', label: 'Item' },
            { key: 'category', label: 'Category' },
            { key: 'qty_on_hand', label: 'On hand', align: 'right' },
            { key: 'unit', label: 'Unit' },
            { key: 'value', label: 'Value', align: 'right', render: (row) => ugx(row.qty_on_hand * row.unit_cost) },
          ]} />
        </section>
        <section className="card p-5">
          <h2 className="section-title">Varieties introduced</h2>
          {varieties.map((variety) => (
            <p key={variety.id} className="border-b border-line py-2 text-sm"><strong>{variety.name}</strong> · {variety.produce} · since {prettyDate(variety.introduced_on)}<br />{variety.notes}</p>
          ))}
        </section>
      </div>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Issued to members</h2>
        <Table rows={issues} columns={[
          { key: 'issue_date', label: 'Date', render: (row) => prettyDate(row.issue_date) },
          { key: 'farmer', label: 'Farmer' },
          { key: 'item', label: 'Item', render: (row) => row.item || 'Cash' },
          { key: 'issue_type', label: 'Type' },
          { key: 'qty', label: 'Qty', align: 'right' },
          { key: 'amount', label: 'Value', align: 'right', render: (row) => ugx(row.amount) },
        ]} />
      </section>
      {canWrite(user.role, 'inputs') ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form action={issueInputAction} className="card form-grid p-4">
            <h2 className="section-title field full">Issue an input</h2>
            <label className="field"><span>Date</span><input type="date" name="issue_date" required /></label>
            <label className="field"><span>Member</span><select name="farmer_id" required><option value="">Choose</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label className="field"><span>Item</span><select name="item_id"><option value="">Cash, no stock item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.qty_on_hand} {item.unit})</option>)}</select></label>
            <label className="field"><span>Type</span><select name="issue_type"><option value="loan">Loan</option><option value="cash">Cash advance</option><option value="equipment">Equipment, expensed</option><option value="grant">Grant</option></select></label>
            <label className="field"><span>Quantity</span><input name="qty" inputMode="decimal" /></label>
            <label className="field"><span>Cash amount</span><input name="amount" inputMode="decimal" /></label>
            <label className="field"><span>Cash from</span><ModeSelect name="pay_from" /></label>
            <label className="field"><span>Due</span><input type="date" name="due_on" /></label>
            <label className="field full"><span>Notes</span><input name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Issue</button></div>
          </form>
          <form action={saveVariety} className="card form-grid p-4">
            <h2 className="section-title field full">Introduce a variety</h2>
            <label className="field"><span>Name</span><input name="name" required /></label>
            <label className="field"><span>Produce</span><input name="produce" required /></label>
            <label className="field"><span>Introduced</span><input type="date" name="introduced_on" /></label>
            <label className="field full"><span>What members should know</span><textarea name="notes" /></label>
            <div className="field"><button className="btn btn-ghost" type="submit">Add variety</button></div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
