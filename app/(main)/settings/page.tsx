import { PageHeader } from '@/components/ui'
import { savePrice, saveSettings } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ugx } from '@/lib/format'
import { canBackup, canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Settings' }

const covered = [
  ['Staff and payroll', 'Biodata, employment, contact, location, position, salary, disability notes, and payroll.'],
  ['Farmers', 'Biodata, group, who recorded the file, consent, and services.'],
  ['Shares', 'Certificates, paid-up capital, and arrears.'],
  ['Gardens', 'Size, GPS, altitude, planting, field age, expected harvest, inspections.'],
  ['Training', 'Trainers, topic, attendees from the register, and representatives.'],
  ['Councils', 'Youth and women councils and their offices.'],
  ['Collections', 'Volumes, grade, quality premium, centre, and a trace code.'],
  ['Payments and sales', 'How a member was paid, and sales tagged to one farmer or sold in bulk.'],
  ['Stock and inputs', 'Batch conversions across value chains, store issues, and varieties.'],
  ['Credit', 'Funders, smallholder products, principal, interest, and facilities.'],
  ['Messages', 'Notices in any language, plus delivery and payment messages.'],
  ['Accounts', 'Income statement, balance sheet, and cash flow from one journal.'],
  ['Reports', 'Filters, on-screen charts, print, and CSV.'],
]

export default async function SettingsPage() {
  const user = await guard('settings')
  const db = getDb()
  const settings = get<any>(db, 'select * from settings where id = 1')
  const prices = all<any>(db, 'select * from price_schedules order by produce, grade, effective_from desc')
  return (
    <div className="stack">
      <PageHeader eyebrow="System" title="Settings" lede="Society profile, prices, backup, and how personal data is handled." />
      {canWrite(user.role, 'settings') ? (
        <form action={saveSettings} className="card form-grid p-4">
          <label className="field wide"><span>Legal name</span><input name="name" defaultValue={settings.name} required /></label>
          <label className="field"><span>Short name</span><input name="short_name" defaultValue={settings.short_name} required /></label>
          <label className="field"><span>Registration</span><input name="registration_no" defaultValue={settings.registration_no || ''} /></label>
          <label className="field"><span>District</span><input name="district" defaultValue={settings.district || ''} /></label>
          <label className="field"><span>Subcounty</span><input name="subcounty" defaultValue={settings.subcounty || ''} /></label>
          <label className="field"><span>Village</span><input name="village" defaultValue={settings.village || ''} /></label>
          <label className="field"><span>Phone</span><input name="phone" defaultValue={settings.phone || ''} /></label>
          <label className="field"><span>Email</span><input name="email" defaultValue={settings.email || ''} /></label>
          <label className="field"><span>Financial year starts</span><input type="date" name="fy_start" defaultValue={settings.fy_start} required /></label>
          <label className="field"><span>Season label</span><input name="season_label" defaultValue={settings.season_label || ''} /></label>
          <label className="field"><span>Retention (years)</span><input name="retention_years" defaultValue={settings.retention_years} /></label>
          <div className="field"><button className="btn btn-primary" type="submit">Save profile</button></div>
        </form>
      ) : (
        <section className="card p-5"><h2 className="section-title">{settings.name}</h2><p>{settings.district} · {settings.registration_no}</p></section>
      )}
      <section className="card p-5">
        <h2 className="section-title">Quality prices</h2>
        <ul className="text-sm">{prices.map((price) => <li key={price.id}>{price.produce} grade {price.grade}: {ugx(price.unit_price)} plus premium {ugx(price.default_premium)} from {price.effective_from}</li>)}</ul>
        {canWrite(user.role, 'prices') || user.role === 'admin' ? (
          <form action={savePrice} className="form-grid mt-3">
            <label className="field"><span>Produce</span><input name="produce" required /></label>
            <label className="field"><span>Grade</span><input name="grade" required /></label>
            <label className="field"><span>Price per kg</span><input name="unit_price" required /></label>
            <label className="field"><span>Default premium</span><input name="default_premium" defaultValue="0" /></label>
            <label className="field"><span>Effective from</span><input type="date" name="effective_from" required /></label>
            <div className="field"><button className="btn btn-ghost" type="submit">Add price</button></div>
          </form>
        ) : null}
      </section>
      <section className="card p-5">
        <h2 className="section-title">Backup and where this runs</h2>
        <p className="text-sm">The database is a file on this computer, so office and field staff see the same records when they use the same server. Copy that file, or download a JSON backup, before any machine change. Financial records in the backup should be kept for {settings.retention_years} years. Passwords are left out of the download.</p>
        {canBackup(user.role) ? <a className="btn btn-primary mt-3" href="/api/backup">Download backup</a> : <p className="mt-2 text-sm">Your role can export reports. A full backup is limited to administrators, managers, and finance.</p>}
      </section>
      <section className="card p-5">
        <h2 className="section-title">Personal data</h2>
        <dl className="kv">
          <dt>Minimisation</dt><dd>Forms ask for what the cooperative uses: membership, gardens, produce, training, and agreed services. SMS is a separate tick, and it is off for imported history.</dd>
          <dt>Accuracy</dt><dd>Member, staff, and garden records can be corrected. Deliveries, payments, sales, and journals stay as posted; a finance officer reverses a mistake with another journal.</dd>
          <dt>Storage</dt><dd>The retention figure above is the cooperative&apos;s rule of thumb. The file is not deleted automatically.</dd>
          <dt>Integrity and confidentiality</dt><dd>Passwords are hashed. The session cookie is not readable by page scripts. Roles limit who can change or export records. The audit log names the user.</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">This copy stores data in a local file and does not encrypt that file itself. A live deployment should sit on HTTPS, on a disk the host encrypts, with backups kept off the office machine. The SMS gateway is not connected, so a recorded message does not leave the server.</p>
      </section>
      <section className="card p-5">
        <h2 className="section-title">What this system covers</h2>
        <ul className="mt-2 space-y-2 text-sm">{covered.map(([title, text]) => <li key={title}><strong>{title}.</strong> {text}</li>)}</ul>
        <p className="mt-3 text-sm text-muted">Rwenzori Highland Coffee Growers is a fictional society used to demonstrate the system. The people, phone numbers, and national IDs are not real.</p>
      </section>
    </div>
  )
}
