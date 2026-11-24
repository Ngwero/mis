'use client'

import { useMemo, useState } from 'react'
import { convertStockAction, recordCollectionAction, recordPaymentAction, recordSaleAction, saveTrainingAction } from '@/lib/actions'
import { sh, ugx } from '@/lib/format'
import { Field, ModeSelect } from '@/components/ui'

type Farmer = { id: number; name: string; code: string; group_name?: string | null }
type Garden = { id: number; farmer_id: number; name: string; produce: string | null }
type Centre = { id: number; name: string }
type Price = { produce: string; grade: string; unit_price: number; default_premium: number }

export function CollectionForm({ farmers, gardens, centres, prices }: {
  farmers: Farmer[]
  gardens: Garden[]
  centres: Centre[]
  prices: Price[]
}) {
  const [farmerId, setFarmerId] = useState('')
  const [produce, setProduce] = useState(prices[0]?.produce || 'Arabica coffee')
  const [grade, setGrade] = useState(prices[0]?.grade || 'A')
  const [volume, setVolume] = useState('')
  const [premium, setPremium] = useState('')
  const mine = gardens.filter((garden) => String(garden.farmer_id) === farmerId)
  const produces = [...new Set(prices.map((price) => price.produce))]
  const grades = prices.filter((price) => price.produce === produce)
  const schedule = grades.find((price) => price.grade === grade) || grades[0]
  const usedPremium = premium === '' ? Number(schedule?.default_premium || 0) : Number(premium)
  const gross = sh(Number(volume || 0) * (Number(schedule?.unit_price || 0) + (Number.isFinite(usedPremium) ? usedPremium : 0)))

  return (
    <form action={recordCollectionAction} className="form-grid">
      <Field label="Date"><input type="date" name="collection_date" required defaultValue="2026-11-24" /></Field>
      <Field label="Member">
        <select name="farmer_id" required value={farmerId} onChange={(event) => setFarmerId(event.target.value)}>
          <option value="">Choose</option>
          {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.code} · {farmer.name}</option>)}
        </select>
      </Field>
      <Field label="Garden">
        <select name="garden_id" defaultValue="">
          <option value="">Not linked</option>
          {mine.map((garden) => <option key={garden.id} value={garden.id}>{garden.name}</option>)}
        </select>
      </Field>
      <Field label="Bulking centre">
        <select name="centre_id" required defaultValue={centres[0]?.id}>
          {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
        </select>
      </Field>
      <Field label="Produce">
        <select name="produce" value={produce} onChange={(event) => { setProduce(event.target.value); setGrade(prices.find((price) => price.produce === event.target.value)?.grade || '') }}>
          {produces.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Grade">
        <select name="grade" value={grade} onChange={(event) => setGrade(event.target.value)}>
          {grades.map((item) => <option key={item.grade} value={item.grade}>{item.grade} · {ugx(item.unit_price)} / kg</option>)}
        </select>
      </Field>
      <Field label="Quantity (kg)"><input name="volume_kg" inputMode="decimal" required value={volume} onChange={(event) => setVolume(event.target.value)} /></Field>
      <Field label="Moisture %"><input name="moisture" inputMode="decimal" /></Field>
      <Field label="Defects %"><input name="defects_pct" inputMode="decimal" /></Field>
      <Field label="Premium per kg" hint="Leave blank to use the schedule.">
        <input name="premium" inputMode="decimal" value={premium} onChange={(event) => setPremium(event.target.value)} placeholder={String(schedule?.default_premium || 0)} />
      </Field>
      <Field label="Amount due"><input readOnly value={schedule ? ugx(gross) : 'No price for this grade'} /></Field>
      <Field label="Language">
        <select name="language" defaultValue="English"><option>English</option><option>Kiswahili</option><option>Luganda</option><option>Runyankole-Rukiga</option><option>French</option></select>
      </Field>
      <Field label="Notes" wide><input name="notes" /></Field>
      <label className="check field full"><input type="checkbox" name="notify" /> Record a delivery message if the member has agreed to SMS</label>
      <div className="field"><button className="btn btn-primary" type="submit">Save delivery</button></div>
    </form>
  )
}

export function PaymentForm({ farmers, collections }: {
  farmers: Farmer[]
  collections: { id: number; farmer_id: number; receipt_no: string; trace_code: string; remaining: number }[]
}) {
  const [farmerId, setFarmerId] = useState('')
  const [applied, setApplied] = useState('collection')
  const open = collections.filter((item) => String(item.farmer_id) === farmerId && item.remaining > 0)
  return (
    <form action={recordPaymentAction} className="form-grid">
      <Field label="Date"><input type="date" name="payment_date" required defaultValue="2026-11-24" /></Field>
      <Field label="Member">
        <select name="farmer_id" required value={farmerId} onChange={(event) => setFarmerId(event.target.value)}>
          <option value="">Choose</option>
          {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}
        </select>
      </Field>
      <Field label="Apply to">
        <select name="applied_to" value={applied} onChange={(event) => setApplied(event.target.value)}>
          <option value="collection">A delivery</option>
          <option value="opening">Prior-season balance</option>
          <option value="other">Other payment</option>
        </select>
      </Field>
      {applied === 'collection' ? (
        <Field label="Delivery" wide>
          <select name="collection_id" required>
            <option value="">Choose</option>
            {open.map((item) => <option key={item.id} value={item.id}>{item.receipt_no} · {item.trace_code} · {ugx(item.remaining)} open</option>)}
          </select>
        </Field>
      ) : null}
      {applied === 'other' ? (
        <Field label="Direction">
          <select name="direction" defaultValue="to_farmer">
            <option value="to_farmer">Paid out to the member</option>
            <option value="from_farmer">Received from the member</option>
          </select>
        </Field>
      ) : null}
      <Field label="Mode"><ModeSelect /></Field>
      <Field label="Amount"><input name="amount" inputMode="decimal" required /></Field>
      <Field label="Language">
        <select name="language" defaultValue="English"><option>English</option><option>Kiswahili</option></select>
      </Field>
      <Field label="Notes" wide><input name="notes" /></Field>
      <label className="check field full"><input type="checkbox" name="notify" /> Record a payment message where consent exists</label>
      <div className="field"><button className="btn btn-primary" type="submit">Post payment</button></div>
    </form>
  )
}

export function SaleForm({ batches, farmers }: {
  batches: { id: number; trace_code: string; produce: string; state: string; qty: number; location: string | null }[]
  farmers: Farmer[]
}) {
  return (
    <form action={recordSaleAction} className="form-grid">
      <Field label="Date"><input type="date" name="sale_date" required defaultValue="2026-11-24" /></Field>
      <Field label="Batch" wide>
        <select name="batch_id" required>
          <option value="">Choose</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>{batch.trace_code} · {batch.produce} · {batch.state} · {batch.qty} kg · {batch.location}</option>
          ))}
        </select>
      </Field>
      <Field label="Quantity (kg)"><input name="qty" inputMode="decimal" required /></Field>
      <Field label="Price per kg"><input name="unit_price" inputMode="decimal" required /></Field>
      <Field label="Payment"><ModeSelect credit /></Field>
      <Field label="Tag a member" hint="Use this for an individual farmer sale. Leave blank for a bulk sale.">
        <select name="farmer_id" defaultValue="">
          <option value="">Bulk / no single member</option>
          {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}
        </select>
      </Field>
      <Field label="Buyer"><input name="buyer_name" required /></Field>
      <Field label="Buyer contact"><input name="buyer_contact" /></Field>
      <Field label="Buyer type"><input name="buyer_type" placeholder="Exporter, local market, roastery" /></Field>
      <Field label="Notes" full><input name="notes" /></Field>
      <div className="field"><button className="btn btn-primary" type="submit">Post sale</button></div>
    </form>
  )
}

export function ConvertForm({ batches }: { batches: { id: number; trace_code: string; produce: string; state: string; qty: number }[] }) {
  const [rows, setRows] = useState([0, 1])
  const choices = useMemo(() => batches.filter((batch) => batch.qty > 0), [batches])
  return (
    <form action={convertStockAction} className="stack">
      <div className="form-grid">
        <Field label="Date"><input type="date" name="conv_date" required defaultValue="2026-11-24" /></Field>
        <Field label="Process">
          <select name="process" defaultValue="Pulping and drying">
            {['Pulping and drying', 'Hulling', 'Grading', 'Roasting', 'Packaging', 'Milling', 'Sorting', 'Other'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="If other, name it"><input name="process_custom" /></Field>
        <Field label="Output state">
          <select name="output_state" defaultValue="parchment">
            {['cherry', 'parchment', 'green', 'graded', 'roasted', 'packaged', 'grain', 'flour', 'other'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Custom state"><input name="state_custom" /></Field>
        <Field label="Output kg"><input name="output_qty" inputMode="decimal" required /></Field>
        <Field label="Location"><input name="location" required placeholder="Processing room" /></Field>
        <Field label="Processing cost"><input name="process_cost" inputMode="decimal" defaultValue="0" /></Field>
        <Field label="Pay cost from"><ModeSelect name="pay_from" /></Field>
        <Field label="Notes" full><input name="notes" /></Field>
      </div>
      <div className="stack">
        {rows.map((row) => (
          <div className="form-grid" key={row}>
            <Field label="Input batch" wide>
              <select name="batch_id" defaultValue="">
                <option value="">None</option>
                {choices.map((batch) => <option key={batch.id} value={batch.id}>{batch.trace_code} · {batch.produce} {batch.state} · {batch.qty} kg</option>)}
              </select>
            </Field>
            <Field label="Kg used"><input name="qty" inputMode="decimal" /></Field>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" type="button" onClick={() => setRows((current) => [...current, current.length])}>Add another input batch</button>
        <button className="btn btn-primary" type="submit">Post conversion</button>
      </div>
    </form>
  )
}

export function TrainingForm({ farmers, staff }: {
  farmers: { id: number; name: string; group_name: string | null; gender: string | null; age: number | null; phone: string | null }[]
  staff: { id: number; name: string; position: string | null }[]
}) {
  const [audience, setAudience] = useState('farmer')
  const [picked, setPicked] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [reps, setReps] = useState<{ name: string; phone: string; gender: string; dob: string }[]>([])
  const visible = farmers.filter((farmer) => `${farmer.name} ${farmer.group_name || ''}`.toLowerCase().includes(query.toLowerCase()))
  function toggle(id: number) {
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  return (
    <form action={saveTrainingAction} className="stack">
      <div className="form-grid">
        <Field label="Date"><input type="date" name="training_date" required /></Field>
        <Field label="Audience">
          <select name="audience" value={audience} onChange={(event) => { setAudience(event.target.value); setPicked([]) }}>
            <option value="farmer">Farmers</option>
            <option value="staff">Staff</option>
          </select>
        </Field>
        <Field label="Topic" wide><input name="topic" required /></Field>
        <Field label="Trainers"><input name="trainers" /></Field>
        <Field label="Location"><input name="location" /></Field>
        <Field label="Language"><input name="language" placeholder="English, Kiswahili, Lhukonzo" /></Field>
        <Field label="Summary" full><textarea name="summary" /></Field>
        <Field label="Additional information" full><textarea name="notes" /></Field>
      </div>
      <input type="hidden" name="farmers" value={audience === 'farmer' ? JSON.stringify(picked) : '[]'} />
      <input type="hidden" name="staff" value={audience === 'staff' ? JSON.stringify(picked) : '[]'} />
      <input type="hidden" name="reps" value={JSON.stringify(reps)} />
      {audience === 'farmer' ? (
        <div>
          <p className="label">Attendees from the farmer list</p>
          <input className="mb-2" placeholder="Search name or group" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="picker">
            {visible.map((farmer) => (
              <label key={farmer.id}>
                <input type="checkbox" checked={picked.includes(farmer.id)} onChange={() => toggle(farmer.id)} />
                <span>{farmer.name} · {farmer.group_name || 'No group'} · {farmer.gender || '—'} · {farmer.age ?? '—'} yrs · {farmer.phone || 'no phone'}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 stack">
            {reps.map((rep, index) => (
              <div className="form-grid" key={index}>
                <Field label="Representative"><input value={rep.name} onChange={(event) => setReps(reps.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></Field>
                <Field label="Contact"><input value={rep.phone} onChange={(event) => setReps(reps.map((item, i) => i === index ? { ...item, phone: event.target.value } : item))} /></Field>
                <Field label="Gender"><input value={rep.gender} onChange={(event) => setReps(reps.map((item, i) => i === index ? { ...item, gender: event.target.value } : item))} /></Field>
                <Field label="Date of birth"><input type="date" value={rep.dob} onChange={(event) => setReps(reps.map((item, i) => i === index ? { ...item, dob: event.target.value } : item))} /></Field>
              </div>
            ))}
            <button className="btn btn-ghost" type="button" onClick={() => setReps([...reps, { name: '', phone: '', gender: '', dob: '' }])}>Add a representative</button>
          </div>
        </div>
      ) : (
        <div className="picker">
          {staff.map((person) => (
            <label key={person.id}>
              <input type="checkbox" checked={picked.includes(person.id)} onChange={() => toggle(person.id)} />
              <span>{person.name} · {person.position}</span>
            </label>
          ))}
        </div>
      )}
      <button className="btn btn-primary" type="submit">Save training</button>
    </form>
  )
}
