import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { guard } from '@/lib/auth'
import { REPORTS } from '@/lib/reports'
import { canSeeReport } from '@/lib/rbac'

export const metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const user = await guard('reports')
  const visible = REPORTS.filter((report) => canSeeReport(user.role, report.slug))
  const groups = [...new Set(visible.map((report) => report.group))]
  return (
    <div>
      <PageHeader eyebrow="System" title="Reports" lede="Filter a report, then print it or export the same rows as CSV. Partners with the viewer role can open these without changing records." />
      {groups.map((group) => (
        <section key={group} className="mb-6">
          <h2 className="section-title">{group}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.filter((report) => report.group === group).map((report) => (
              <Link key={report.slug} href={`/reports/${report.slug}`} className="card p-4 hover:border-gold">
                <h3 className="font-semibold text-forest">{report.title}</h3>
                <p className="mt-1 text-sm text-muted">{report.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
