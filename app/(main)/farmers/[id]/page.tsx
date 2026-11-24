import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, PageHeader, Table, statusTone } from '@/components/ui'
import { addService, saveFarmer } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ageOn, kg, prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Farmer' }

export default async function FarmerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guard('farmers')
  const { id } = await params
  const db = getDb()
  const farmer = get<any>(db, `select f.*, g.name as group_name, g.code as group_code, coalesce(u.name, f.recorded_by_name) as recorded_by
    from farmers f left join groups g on g.id = f.group_id left join users u on u.id = f.added_by where f.id = ?`, id)
  if (!farmer) notFound()
  const groups = all<any>(db, 'select id, name from groups order by name')
  const gardens = all<any>(db, 'select * from gardens where farmer_id = ?', id)
  const shares = all<any>(db, 'select * from shares where farmer_id = ?', id)
  const collections = all<any>(db, 'select * from collections where farmer_id = ? order by collection_date desc', id)
  const payments = all<any>(db, 'select * from payments where farmer_id = ? order by payment_date desc', id)
  const loans = all<any>(db, 'select * from loans where farmer_id = ? order by disbursed_on desc', id)
  const training = all<any>(db, `select t.training_date, t.topic, a.age from training_attendees a join trainings t on t.id = a.training_id where a.farmer_id = ?`, id)
  const services = all<any>(db, 'select * from services where farmer_id = ? order by service_date desc', id)
  const inputs = all<any>(db, `select i.*, it.name as item from input_issues i left join input_items it on it.id = i.item_id where i.farmer_id = ?`, id)
  const openingPaid = get<any>(db, "select coalesce(sum(amount),0) as s from payments where farmer_id = ? and applied_to = 'opening'", id)
  const deliveryDue = collections.reduce((sum, row) => sum + Number(row.gross_amount) - Number(row.amount_paid), 0)
  const balance = Number(farmer.opening_payable) - Number(openingPaid.s) + deliveryDue
  const sharePaid = shares.reduce((sum, row) => sum + Number(row.amount_paid), 0)
  return (
    <div>
      <PageHeader eyebrow={farmer.farmer_code} title={`${farmer.first_name} ${farmer.last_name}`} lede={`${farmer.group_name || 'No group'} · recorded by ${farmer.recorded_by || 'unknown'}`}>
        <Badge tone={statusTone(farmer.status)}>{farmer.status}</Badge>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card stat"><p className="stat-label">Balance due</p><p className="stat-value">{ugx(balance)}</p></article>
        <article className="card stat"><p className="stat-label">Shares paid</p><p className="stat-value">{ugx(sharePaid)}</p></article>
        <article className="card stat"><p className="stat-label">Gardens</p><p className="stat-value">{gardens.length}</p></article>
        <article className="card stat"><p className="stat-label">Deliveries</p><p className="stat-value">{collections.length}</p></article>
      </div>
      <div className="split mt-4">
        <section className="card p-5">
          <h2 className="section-title">Biodata and location</h2>
          <dl className="kv">
            <dt>Gender</dt><dd>{farmer.gender || '—'}</dd>
            <dt>Date of birth</dt><dd>{prettyDate(farmer.dob)} {ageOn(farmer.dob) != null ? `(${ageOn(farmer.dob)})` : ''}</dd>
            <dt>National ID</dt><dd>{farmer.national_id || '—'}</dd>
            <dt>Phone</dt><dd>{farmer.phone || '—'} {farmer.alt_phone ? ` / ${farmer.alt_phone}` : ''}</dd>
            <dt>Location</dt><dd>{[farmer.village, farmer.parish, farmer.subcounty, farmer.district].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Household</dt><dd>{farmer.household_size || '—'} · {farmer.marital_status || '—'} · {farmer.education || '—'}</dd>
            <dt>Enterprise</dt><dd>{farmer.main_enterprise || '—'}</dd>
            <dt>Disability</dt><dd>{farmer.pwd ? farmer.pwd_notes || 'Yes' : 'No'}</dd>
            <dt>Consent</dt><dd>{farmer.consent_store ? 'Membership record kept' : 'No storage consent'} · {farmer.consent_sms ? 'SMS allowed' : 'No SMS'}</dd>
            <dt>Joined</dt><dd>{prettyDate(farmer.membership_date)}</dd>
            <dt>Notes</dt><dd>{farmer.notes || '—'}</dd>
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="section-title">Shares</h2>
          {shares.map((share) => (
            <p key={share.id} className="text-sm">{share.certificate_no}: {share.share_count} {share.class_name} shares, {ugx(share.amount_paid)} paid of {ugx(share.share_count * share.nominal_value)}</p>
          ))}
          {!shares.length ? <p className="muted text-sm">No shares recorded.</p> : null}
        </section>
      </div>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Gardens</h2>
        <Table rows={gardens} columns={[
          { key: 'name', label: 'Garden', render: (row) => <Link className="font-semibold text-leaf" href={`/gardens/${row.id}`}>{row.name}</Link> },
          { key: 'size_ha', label: 'Ha', align: 'right' },
          { key: 'produce', label: 'Produce' },
          { key: 'variety', label: 'Variety' },
          { key: 'altitude_m', label: 'Altitude', align: 'right' },
          { key: 'expected_harvest', label: 'Harvest', render: (row) => prettyDate(row.expected_harvest) },
        ]} />
      </section>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Deliveries</h2>
        <Table rows={collections} columns={[
          { key: 'collection_date', label: 'Date', render: (row) => prettyDate(row.collection_date) },
          { key: 'trace_code', label: 'Trace', render: (row) => <Link className="font-semibold text-leaf" href={`/trace?code=${row.trace_code}`}>{row.trace_code}</Link> },
          { key: 'produce', label: 'Produce', render: (row) => `${row.produce} ${row.grade}` },
          { key: 'volume_kg', label: 'Kg', align: 'right', render: (row) => kg(row.volume_kg, 0) },
          { key: 'gross_amount', label: 'Due', align: 'right', render: (row) => ugx(row.gross_amount) },
          { key: 'payment_status', label: 'Status' },
        ]} />
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title px-4 pt-4">Payments</h2>
          <Table rows={payments} columns={[
            { key: 'payment_date', label: 'Date', render: (row) => prettyDate(row.payment_date) },
            { key: 'payment_no', label: 'No.' },
            { key: 'applied_to', label: 'Applied to' },
            { key: 'mode', label: 'Mode' },
            { key: 'amount', label: 'Amount', align: 'right', render: (row) => ugx(row.amount) },
          ]} />
        </section>
        <section className="card">
          <h2 className="section-title px-4 pt-4">Loans and inputs</h2>
          <Table rows={loans} columns={[
            { key: 'code', label: 'Loan' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'outstanding', label: 'Outstanding', align: 'right', render: (row) => ugx(row.outstanding) },
          ]} />
          <Table rows={inputs} empty="No inputs issued in this season." columns={[
            { key: 'issue_date', label: 'Date', render: (row) => prettyDate(row.issue_date) },
            { key: 'item', label: 'Item', render: (row) => row.item || 'Cash' },
            { key: 'issue_type', label: 'Type' },
            { key: 'amount', label: 'Value', align: 'right', render: (row) => ugx(row.amount) },
          ]} />
        </section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="section-title">Training</h2>
          {training.map((row) => <p key={row.topic + row.training_date} className="text-sm">{prettyDate(row.training_date)} · {row.topic}</p>)}
          {!training.length ? <p className="muted text-sm">No training recorded.</p> : null}
        </section>
        <section className="card p-5">
          <h2 className="section-title">Services</h2>
          {services.map((row) => <p key={row.id} className="text-sm">{prettyDate(row.service_date)} · {row.service} · {row.staff_name}</p>)}
          {!services.length ? <p className="muted text-sm">No services recorded.</p> : null}
          {canWrite(user.role, 'services') ? (
            <form action={addService} className="form-grid mt-3">
              <input type="hidden" name="farmer_id" value={farmer.id} />
              <label className="field"><span>Date</span><input type="date" name="service_date" required /></label>
              <label className="field"><span>Service</span><input name="service" required /></label>
              <label className="field wide"><span>Notes</span><input name="notes" /></label>
              <div className="field"><button className="btn btn-ghost" type="submit">Add service</button></div>
            </form>
          ) : null}
        </section>
      </div>
      {canWrite(user.role, 'farmers') ? (
        <details className="card details mt-4">
          <summary>Update this record</summary>
          <form action={saveFarmer} className="form-grid">
            <input type="hidden" name="id" value={farmer.id} />
            <label className="field"><span>First name</span><input name="first_name" defaultValue={farmer.first_name} required /></label>
            <label className="field"><span>Last name</span><input name="last_name" defaultValue={farmer.last_name} required /></label>
            <label className="field"><span>Gender</span><input name="gender" defaultValue={farmer.gender || ''} /></label>
            <label className="field"><span>Date of birth</span><input type="date" name="dob" defaultValue={farmer.dob || ''} /></label>
            <label className="field"><span>Phone</span><input name="phone" defaultValue={farmer.phone || ''} /></label>
            <label className="field"><span>Other phone</span><input name="alt_phone" defaultValue={farmer.alt_phone || ''} /></label>
            <label className="field"><span>National ID</span><input name="national_id" defaultValue={farmer.national_id || ''} /></label>
            <label className="field"><span>Group</span><select name="group_id" defaultValue={farmer.group_id || ''}><option value="">None</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Village</span><input name="village" defaultValue={farmer.village || ''} /></label>
            <label className="field"><span>Parish</span><input name="parish" defaultValue={farmer.parish || ''} /></label>
            <label className="field"><span>Subcounty</span><input name="subcounty" defaultValue={farmer.subcounty || ''} /></label>
            <label className="field"><span>District</span><input name="district" defaultValue={farmer.district || ''} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={farmer.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="withdrawn">Withdrawn</option></select></label>
            <label className="field"><span>Household size</span><input name="household_size" defaultValue={farmer.household_size || ''} /></label>
            <label className="field"><span>Education</span><input name="education" defaultValue={farmer.education || ''} /></label>
            <label className="field"><span>Marital status</span><input name="marital_status" defaultValue={farmer.marital_status || ''} /></label>
            <label className="field"><span>Enterprise</span><input name="main_enterprise" defaultValue={farmer.main_enterprise || ''} /></label>
            <label className="field"><span>Membership date</span><input type="date" name="membership_date" defaultValue={farmer.membership_date || ''} /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" defaultValue={farmer.notes || ''} /></label>
            <label className="check field"><input type="checkbox" name="consent_store" defaultChecked={!!farmer.consent_store} /> Membership record</label>
            <label className="check field"><input type="checkbox" name="consent_sms" defaultChecked={!!farmer.consent_sms} /> SMS consent</label>
            <label className="check field"><input type="checkbox" name="pwd" defaultChecked={!!farmer.pwd} /> Person with a disability</label>
            <label className="field wide"><span>Disability note</span><input name="pwd_notes" defaultValue={farmer.pwd_notes || ''} /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save changes</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
