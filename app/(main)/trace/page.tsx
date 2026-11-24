import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { kg, prettyDate, ugx } from '@/lib/format'
import { one } from '@/lib/form'
import { traceLot } from '@/lib/trace'

export const metadata = { title: 'Traceability' }

export default async function TracePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await guard('collections')
  const code = one((await searchParams).code)
  const lot = code ? traceLot(getDb(), code) : null
  const events = lot ? buildEvents(lot) : []
  return (
    <div>
      <PageHeader eyebrow="Produce" title="Traceability" lede="Search a trace code, receipt, or batch. The chain keeps the garden, the receipt, every conversion, and the sale." />
      <form className="card mb-4 flex flex-wrap gap-2 p-3" method="get">
        <input name="code" defaultValue={code} placeholder="RHC-26-00007" className="max-w-sm" />
        <button className="btn btn-primary" type="submit">Follow the lot</button>
      </form>
      {!code ? <p className="muted text-sm">Try RHC-26-00007 for a single-farmer lot that was pulped, hulled, roasted, and sold. RHC-26-B001 is a bulked parchment lot. RHC-26-F013 is milled maize.</p> : null}
      {code && !lot ? <p className="card p-5">No lot matches {code}.</p> : null}
      {lot ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-5">
            <h2 className="section-title">What happened</h2>
            <div className="timeline mt-3">
              {events.map((event) => (
                <div className="event" key={event.title + event.date}>
                  <i />
                  <div className="pb-4">
                    <p className="text-xs uppercase tracking-wide text-gold">{prettyDate(event.date)}</p>
                    <p className="font-semibold text-forest">{event.title}</p>
                    <p className="text-sm text-muted">{event.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="section-title">Batches in this chain</h2>
            {lot.batches.map((batch) => (
              <p key={batch.id} className="border-b border-line py-2 text-sm">
                <strong>{batch.trace_code}</strong> · {batch.produce} · {batch.state}<br />
                {kg(batch.qty)} on hand · value {ugx(batch.total_cost)} · {batch.location}
              </p>
            ))}
            <h2 className="section-title mt-4">Receipts</h2>
            {lot.collections.map((row) => (
              <p key={row.id} className="text-sm">
                {row.receipt_no} · <Link className="text-leaf" href={`/farmers/${row.farmer_id}`}>{row.first_name} {row.last_name}</Link>
                {row.garden_name ? ` · ${row.garden_name}` : ''} · {row.centre_name} · {row.group_name}
              </p>
            ))}
            {!lot.collections.length ? <p className="muted text-sm">This lot started from stock already on hand, not from a current receipt.</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function buildEvents(lot: NonNullable<ReturnType<typeof traceLot>>) {
  const events: { date: string; title: string; body: string }[] = []
  for (const row of lot.collections) {
    events.push({
      date: row.collection_date,
      title: `Received ${row.receipt_no}`,
      body: `${row.volume_kg} kg ${row.produce} grade ${row.grade} from ${row.first_name} ${row.last_name}${row.garden_name ? `, ${row.garden_name}` : ''} at ${row.centre_name}. Due ${ugx(row.gross_amount)} (${ugx(row.unit_price)} + premium ${ugx(row.premium)}). Trace ${row.trace_code}.`,
    })
  }
  for (const row of lot.payments) {
    events.push({
      date: row.payment_date,
      title: `Member paid ${row.payment_no}`,
      body: `${ugx(row.amount)} by ${String(row.mode).replace('_', ' ')} to ${row.first_name} ${row.last_name}.`,
    })
  }
  for (const row of lot.conversions) {
    const inputs = lot.inputs.filter((item) => item.conversion_id === row.id)
    events.push({
      date: row.conv_date,
      title: row.process,
      body: `${inputs.map((item) => `${item.qty} kg ${item.trace_code}`).join(' and ')} became ${row.output_qty} kg. ${row.notes || ''}`.trim(),
    })
  }
  for (const row of lot.sales) {
    events.push({
      date: row.sale_date,
      title: `Sold ${row.sale_no}`,
      body: `${row.qty} kg ${row.state} to ${row.buyer_name} for ${ugx(row.total_amount)}${row.first_name ? `, tagged to ${row.first_name} ${row.last_name}` : ''}.`,
    })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}
