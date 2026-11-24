import { ugx } from '@/lib/format'
import type { StatementSection } from '@/lib/finance'

export function StatementView({
  title,
  period,
  sections,
  foot,
}: {
  title: string
  period: string
  sections?: StatementSection[]
  foot?: { label: string; amount: number; warn?: boolean }[]
}) {
  return (
    <div className="card p-5">
      <p className="page-kicker">{period}</p>
      <h2 className="section-title mt-1">{title}</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {sections?.map((section) => (
          <section key={section.heading}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{section.heading}</h3>
            {section.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4 border-b border-line py-2 text-sm">
                <span>{line.label}</span>
                <span className="num">{ugx(line.amount)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between font-semibold text-forest">
              <span>{section.totalLabel}</span>
              <span className="num">{ugx(section.total)}</span>
            </div>
          </section>
        ))}
      </div>
      {foot ? (
        <div className="mt-4">
          {foot.map((line) => (
            <div key={line.label} className="flex justify-between border-b border-line py-2 text-sm">
              <span>{line.label}</span>
              <span className={`num ${line.warn ? 'text-danger' : 'font-semibold'}`}>{ugx(line.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
