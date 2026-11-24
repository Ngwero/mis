import Link from 'next/link'
import { PageHeader, Table } from '@/components/ui'
import { saveGarden } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Gardens' }

export default async function GardensPage() {
  const user = await guard('gardens')
  const db = getDb()
  const rows = all<any>(db, `select gd.*, f.first_name || ' ' || f.last_name as farmer from gardens gd join farmers f on f.id = gd.farmer_id order by f.farmer_code`)
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers order by first_name")
  return (
    <div>
      <PageHeader eyebrow="Field" title="Gardens" lede="Name, size, location, GPS, altitude, what is planted, field age, and the expected harvest." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'name', label: 'Garden', render: (row) => <Link className="font-semibold text-leaf" href={`/gardens/${row.id}`}>{row.name}</Link> },
          { key: 'farmer', label: 'Farmer' },
          { key: 'size_ha', label: 'Ha', align: 'right' },
          { key: 'produce', label: 'Produce' },
          { key: 'variety', label: 'Variety' },
          { key: 'altitude_m', label: 'Altitude', align: 'right' },
          { key: 'village', label: 'Village' },
          { key: 'expected_yield_kg', label: 'Expected kg', align: 'right' },
        ]} />
      </div>
      {canWrite(user.role, 'gardens') ? (
        <details className="card details mt-4">
          <summary>Add a garden</summary>
          <form action={saveGarden} className="form-grid">
            <label className="field"><span>Member</span><select name="farmer_id" required><option value="">Choose</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label className="field"><span>Garden name</span><input name="name" required /></label>
            <label className="field"><span>Size (hectares)</span><input name="size_ha" inputMode="decimal" /></label>
            <label className="field"><span>Village</span><input name="village" /></label>
            <label className="field"><span>Latitude</span><input name="latitude" inputMode="decimal" /></label>
            <label className="field"><span>Longitude</span><input name="longitude" inputMode="decimal" /></label>
            <label className="field"><span>Altitude (m)</span><input name="altitude_m" /></label>
            <label className="field"><span>Produce</span><input name="produce" /></label>
            <label className="field"><span>Variety</span><input name="variety" /></label>
            <label className="field"><span>Planting date</span><input type="date" name="planting_date" /></label>
            <label className="field"><span>Spacing</span><input name="spacing" /></label>
            <label className="field"><span>Field age (years)</span><input name="field_age_years" /></label>
            <label className="field"><span>Expected harvest</span><input type="date" name="expected_harvest" /></label>
            <label className="field"><span>Expected yield (kg)</span><input name="expected_yield_kg" /></label>
            <label className="field full"><span>Additional information</span><textarea name="notes" /></label>
            <div className="field"><button className="btn btn-primary" type="submit">Save garden</button></div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
