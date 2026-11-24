import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Bars } from '@/components/charts'
import { PrintButton } from '@/components/print-button'
import { StatementView } from '@/components/statements'
import { PageHeader, ReportTable } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { kg, ugx } from '@/lib/format'
import { one } from '@/lib/form'
import { getReport } from '@/lib/reports'
import { balanceSheet, cashFlow, incomeStatement, type StatementSection } from '@/lib/finance'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Report' }

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await guard('reports')
  const { slug } = await params
  const sp = await searchParams
  const settings = get<any>(getDb(), 'select * from settings where id = 1')
  const filters = {
    from: one(sp.from) || settings.fy_start,
    to: one(sp.to) || new Date().toISOString().slice(0, 10),
    group: one(sp.group),
    produce: one(sp.produce),
    q: one(sp.q),
  }
  let report
  try {
    report = getReport(getDb(), slug, filters, user.role)
  } catch (error) {
    return <p className="card p-5">{error instanceof Error ? error.message : 'This report is not available.'}</p>
  }
  if (!report) notFound()
  const groups = all<any>(getDb(), 'select code, name from groups order by name')
  const query = new URLSearchParams(filters)
  const statement = report.statement as
    | ReturnType<typeof incomeStatement>
    | ReturnType<typeof balanceSheet>
    | ReturnType<typeof cashFlow>
    | undefined
  return (
    <div>
      <div className="print-only">
        <p className="page-kicker">{settings.name}</p>
        <h1 className="font-display text-2xl">{report.title}</h1>
        <p className="text-sm">{filters.from} to {filters.to}</p>
      </div>
      <PageHeader eyebrow="Report" title={report.title} lede={report.description}>
        <PrintButton />
        <a className="btn btn-ghost" href={`/api/export?report=${slug}&${query.toString()}`}>Export CSV</a>
        <Link className="btn btn-ghost" href="/reports">All reports</Link>
      </PageHeader>
      <form className="card mb-4 flex flex-wrap gap-2 p-3 no-print" method="get">
        <input type="date" name="from" defaultValue={filters.from} />
        <input type="date" name="to" defaultValue={filters.to} />
        <select name="group" defaultValue={filters.group}><option value="">All groups</option>{groups.map((group) => <option key={group.code} value={group.code}>{group.name}</option>)}</select>
        <input name="produce" defaultValue={filters.produce} placeholder="Produce" />
        <input name="q" defaultValue={filters.q} placeholder="Search" />
        <button className="btn btn-ghost" type="submit">Filter</button>
      </form>
      {report.chart ? (
        <section className="card mb-4 p-5">
          <h2 className="section-title">{report.chart.title}</h2>
          <Bars data={report.chart.data} format={(value) => report.chart?.title.includes('Kilogram') || report.chart?.title.includes('volume') ? kg(value, 0) : report.chart?.title.toLowerCase().includes('capital') || report.chart?.title.toLowerCase().includes('outstanding') ? ugx(value) : String(value)} />
        </section>
      ) : null}
      {report.kind === 'statement' && statement && 'sections' in statement ? (
        <StatementView
          title={statement.title}
          period={statement.period}
          sections={statement.sections as StatementSection[]}
          foot={'surplus' in statement ? [{ label: 'Surplus', amount: statement.surplus }] : 'gap' in statement ? [{ label: 'Out of balance', amount: statement.gap, warn: statement.gap !== 0 }] : undefined}
        />
      ) : null}
      {report.kind === 'statement' && statement && 'opening' in statement ? (
        <StatementView title={statement.title} period={statement.period} foot={[
          { label: 'Opening cash', amount: statement.opening },
          { label: 'Operating', amount: statement.operating },
          { label: 'Investing', amount: statement.investing },
          { label: 'Financing', amount: statement.financing },
          { label: 'Closing cash', amount: statement.closing },
        ]} />
      ) : null}
      <div className="card mt-4">
        <ReportTable columns={report.columns} rows={report.rows} />
      </div>
    </div>
  )
}
