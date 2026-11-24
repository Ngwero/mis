import Link from 'next/link'
import { Bars, ColumnChart, Gauge } from '@/components/charts'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { balanceSheet } from '@/lib/finance'
import { kg, num, prettyDate, ugx } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Dashboard' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function DashboardPage() {
  const user = await guard('dashboard')
  const db = getDb()
  const settings = get<any>(db, 'select * from settings where id = 1')
  const members = get<any>(db, "select count(*) as c from farmers where status = 'active'")
  const gardens = get<any>(db, 'select count(*) as c from gardens')
  const trainings = get<any>(db, 'select count(*) as c from trainings')
  const seasonKg = get<any>(db, "select coalesce(sum(volume_kg),0) as kg from collections where produce = 'Arabica coffee' and collection_date >= ?", settings.fy_start)
  const settlement = get<any>(db, `select coalesce(sum(amount_paid),0) as paid, coalesce(sum(gross_amount),0) as gross,
    sum(case when payment_status != 'paid' then 1 else 0 end) as open_receipts,
    count(*) as receipts
    from collections`)
  const due = get<any>(db, `select
      (select coalesce(sum(opening_payable),0) from farmers)
      - (select coalesce(sum(amount),0) from payments where applied_to = 'opening')
      + (select coalesce(sum(gross_amount - amount_paid),0) from collections) as due`)
  const cash = get<any>(db, `select coalesce(sum(case when a.code in ('1000','1010','1020') then l.debit - l.credit else 0 end),0) as cash
    from journal_lines l join accounts a on a.id = l.account_id`)
  const series = all<any>(db, `select collection_date as day, volume_kg as kg, gross_amount as due
    from collections order by collection_date, id`)
  const byState = all<any>(db, `select state as label, sum(qty) as value from batches where qty > 0.001 group by state order by value desc`)
  const recent = all<any>(db, `select c.id, c.collection_date, c.receipt_no, c.trace_code, c.volume_kg, c.produce, c.grade, c.gross_amount, c.payment_status,
    f.first_name || ' ' || f.last_name as farmer
    from collections c join farmers f on f.id = c.farmer_id order by c.collection_date desc, c.id desc limit 6`)
  const sheet = balanceSheet(db, new Date().toISOString().slice(0, 10))
  const settled = settlement.gross > 0 ? (settlement.paid / settlement.gross) * 100 : 0
  const chart = series.map((row) => ({
    label: MONTHS[Number(String(row.day).slice(5, 7)) - 1] || '',
    bar: Number(row.kg) || 0,
    line: Number(row.due) || 0,
  }))

  return (
    <div>
      <div className="dash-head">
        <div>
          <p className="page-kicker">{settings.season_label}</p>
          <h1 className="page-title">Season overview</h1>
        </div>
        <nav className="dash-tabs no-print">
          <Link className="on" href="/dashboard">Overview</Link>
          <Link href="/farmers">Farmers</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/stock">Stock</Link>
          <Link href="/reports">Reports</Link>
        </nav>
      </div>

      <div className="dash">
        <div className="dash-col">
          <article className="hero-card">
            <HarvestScene />
            <div className="hero-copy">
              <p>{prettyDate(new Date().toISOString().slice(0, 10))} · {settings.short_name}</p>
              <h2>Highland coffee, on the books.</h2>
            </div>
          </article>
          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title mb-0">Status</h2>
              <span className="badge badge-ok">{sheet.gap === 0 ? 'In balance' : 'Check ledger'}</span>
            </div>
            <div className="status-row"><span>Active members</span><strong>{members.c}</strong></div>
            <div className="status-row"><span>Gardens</span><strong>{gardens.c}</strong></div>
            <div className="status-row"><span>Deliveries</span><strong>{settlement.receipts}</strong></div>
            <div className="status-row"><span>Open receipts</span><strong>{settlement.open_receipts}</strong></div>
            <div className="status-row"><span>Trainings</span><strong>{trainings.c}</strong></div>
          </section>
        </div>

        <div className="dash-col">
          <section className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title mb-0">Delivery volume</h2>
              <div className="legend">
                <span><i style={{ background: '#3f7a3a' }} />Kilograms</span>
                <span><i style={{ background: '#f08a3a' }} />Amount due</span>
              </div>
            </div>
            <ColumnChart data={chart} />
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="card stat">
              <p className="stat-label">Coffee received</p>
              <p className="stat-value">{kg(seasonKg.kg, 0)}</p>
              <p className="stat-hint">Since {prettyDate(settings.fy_start)}</p>
            </article>
            <article className="card stat">
              <p className="stat-label">Still owed to members</p>
              <p className="stat-value">{ugx(due.due)}</p>
              <p className="stat-hint">Opening balances plus unpaid deliveries</p>
            </article>
          </div>
          <section className="card">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="section-title">Latest deliveries</h2>
              <Link className="text-sm font-semibold text-leaf" href="/collections">All collections</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data compact">
                <thead><tr><th>Date</th><th>Member</th><th>Trace</th><th className="num">Kg</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <td>{prettyDate(row.collection_date).replace(/ \d{4}$/, '')}</td>
                      <td>{row.farmer}</td>
                      <td><Link className="font-semibold text-leaf" href={`/trace?code=${row.trace_code}`}>{row.trace_code}</Link></td>
                      <td className="num">{num(row.volume_kg, 0)}</td>
                      <td><span className={`badge badge-${row.payment_status === 'paid' ? 'ok' : row.payment_status === 'partial' ? 'warn' : 'bad'}`}>{row.payment_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="dash-col dash-side">
          <section className="card p-4 text-center">
            <h2 className="section-title text-left">Settled this season</h2>
            <Gauge value={settled} caption="of delivery value paid" />
            <p className="stat-hint">{ugx(settlement.paid)} of {ugx(settlement.gross)}</p>
          </section>
          <section className="card p-4">
            <h2 className="section-title">Stock on hand</h2>
            <Bars data={byState} format={(value) => kg(value, 0)} />
            <p className="stat-hint mt-3">Cash, mobile, and bank {ugx(cash.cash)}</p>
          </section>
          <div className="no-print flex flex-wrap gap-2">
            {canWrite(user.role, 'collections') ? <Link className="btn btn-primary" href="/collections">Record a delivery</Link> : null}
            <Link className="btn btn-gold" href="/trace?code=RHC-26-00007">Follow a lot</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function HarvestScene() {
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4f0d8" />
          <stop offset="100%" stopColor="#8fb56a" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#sky)" />
      <circle cx="318" cy="64" r="28" fill="#f7f3ea" />
      <path d="M0 168 C70 140 120 156 180 132 C250 104 300 128 400 96 L400 320 L0 320 Z" fill="#8fb56a" />
      <path d="M0 214 C90 180 150 206 230 178 C300 156 340 176 400 150 L400 320 L0 320 Z" fill="#3f7a3a" />
      <path d="M0 268 C100 236 180 258 260 236 C320 220 360 236 400 214 L400 320 L0 320 Z" fill="#1a3a28" />
      {[48, 108, 168, 228, 288, 348].map((x) => (
        <g key={x}>
          <rect x={x + 8} y="188" width="4" height="28" fill="#14301f" />
          <ellipse cx={x + 10} cy="182" rx="16" ry="18" fill="#245c38" />
          <ellipse cx={x + 4} cy="176" rx="8" ry="8" fill="#6f9a45" />
        </g>
      ))}
    </svg>
  )
}
