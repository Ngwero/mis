import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader, Table } from '@/components/ui'
import { addInspection } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Garden' }

export default async function GardenPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guard('gardens')
  const { id } = await params
  const garden = get<any>(getDb(), `select gd.*, f.first_name || ' ' || f.last_name as farmer, f.id as owner from gardens gd join farmers f on f.id = gd.farmer_id where gd.id = ?`, id)
  if (!garden) notFound()
  const inspections = all<any>(getDb(), 'select * from inspections where garden_id = ? order by inspection_date desc', id)
  const map = garden.latitude != null ? `https://www.openstreetmap.org/?mlat=${garden.latitude}&mlon=${garden.longitude}#map=16/${garden.latitude}/${garden.longitude}` : null
  return (
    <div>
      <PageHeader eyebrow="Garden" title={garden.name} lede={<>Member <Link className="text-leaf" href={`/farmers/${garden.owner}`}>{garden.farmer}</Link></>} />
      <section className="card p-5">
        <dl className="kv">
          <dt>Size</dt><dd>{garden.size_ha} ha · {garden.plant_population || '—'} plants · {garden.spacing || 'spacing not recorded'}</dd>
          <dt>Location</dt><dd>{[garden.village, garden.parish, garden.subcounty, garden.district].filter(Boolean).join(', ')}</dd>
          <dt>GPS</dt><dd>{garden.latitude != null ? `${garden.latitude}, ${garden.longitude}` : '—'} {map ? <a className="text-leaf" href={map} target="_blank" rel="noreferrer">Open map</a> : null}</dd>
          <dt>Altitude</dt><dd>{garden.altitude_m ? `${garden.altitude_m} m` : '—'}</dd>
          <dt>Planted</dt><dd>{garden.produce} · {garden.variety} · planted {prettyDate(garden.planting_date)} · field age {garden.field_age_years ?? '—'} years</dd>
          <dt>Expected harvest</dt><dd>{prettyDate(garden.expected_harvest)} · {garden.expected_yield_kg || '—'} kg</dd>
          <dt>Conditions</dt><dd>{[garden.soil_type, garden.shade, garden.irrigation].filter(Boolean).join(' · ') || '—'}</dd>
          <dt>Notes</dt><dd>{garden.notes || '—'}</dd>
        </dl>
      </section>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Inspections and certificates</h2>
        <Table rows={inspections} columns={[
          { key: 'inspection_date', label: 'Date', render: (row) => prettyDate(row.inspection_date) },
          { key: 'inspection_type', label: 'Type' },
          { key: 'inspector', label: 'Inspector' },
          { key: 'result', label: 'Result' },
          { key: 'certificate_no', label: 'Certificate' },
          { key: 'notes', label: 'Notes' },
        ]} />
      </section>
      {canWrite(user.role, 'inspections') ? (
        <form action={addInspection} className="card mt-4 form-grid p-4">
          <input type="hidden" name="garden_id" value={garden.id} />
          <label className="field"><span>Date</span><input type="date" name="inspection_date" required /></label>
          <label className="field"><span>Type</span><input name="inspection_type" required placeholder="Internal, organic, pre-harvest" /></label>
          <label className="field"><span>Inspector</span><input name="inspector" /></label>
          <label className="field"><span>Result</span><input name="result" /></label>
          <label className="field"><span>Certificate</span><input name="certificate_no" /></label>
          <label className="field wide"><span>Notes</span><input name="notes" /></label>
          <div className="field"><button className="btn btn-primary" type="submit">Record inspection</button></div>
        </form>
      ) : null}
    </div>
  )
}
