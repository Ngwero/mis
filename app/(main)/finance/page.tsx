import { PageHeader, Table } from '@/components/ui'
import { StatementView } from '@/components/statements'
import { postJournalAction } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { balanceSheet, cashFlow, incomeStatement } from '@/lib/finance'
import { prettyDate, ugx } from '@/lib/format'
import { one } from '@/lib/form'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Financial statements' }

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await guard('finance')
  const sp = await searchParams
  const settings = get<any>(getDb(), 'select fy_start from settings where id = 1')
  const from = one(sp.from) || settings.fy_start
  const to = one(sp.to) || new Date().toISOString().slice(0, 10)
  const db = getDb()
  const income = incomeStatement(db, from, to)
  const sheet = balanceSheet(db, to)
  const flow = cashFlow(db, from, to)
  const accounts = all<any>(db, 'select code, name from accounts order by code')
  const journals = all<any>(db, `select j.*, (select sum(debit) from journal_lines l where l.journal_id = j.id) as amount
    from journals j order by j.entry_date desc, j.id desc limit 12`)
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Financial statements" lede="Income statement, balance sheet, and cash flow are drawn from the same journal. Member deliveries, payments, sales, payroll, and loans post into it.">
        <form className="flex flex-wrap gap-2" method="get">
          <input type="date" name="from" defaultValue={from} />
          <input type="date" name="to" defaultValue={to} />
          <button className="btn btn-ghost" type="submit">Apply dates</button>
        </form>
      </PageHeader>
      <div className="stack">
        <StatementView title="Income statement" period={income.period} sections={income.sections} foot={[{ label: 'Surplus', amount: income.surplus }]} />
        <StatementView title="Balance sheet" period={sheet.period} sections={sheet.sections} foot={[{ label: 'Out of balance', amount: sheet.gap, warn: sheet.gap !== 0 }]} />
        <StatementView
          title="Cash flow"
          period={flow.period}
          foot={[
            { label: 'Opening cash', amount: flow.opening },
            { label: 'Operating', amount: flow.operating },
            { label: 'Investing', amount: flow.investing },
            { label: 'Financing', amount: flow.financing },
            { label: 'Closing cash', amount: flow.closing },
            { label: 'Does not reconcile', amount: flow.gap, warn: flow.gap !== 0 },
          ]}
        />
      </div>
      <p className="mt-3 text-sm text-muted">Loan repayments, including the interest paid or received with them, are classed as financing. Processing cost sits in stock until the lot is sold.</p>
      <section className="card mt-4">
        <h2 className="section-title px-4 pt-4">Recent journals</h2>
        <Table rows={journals} columns={[
          { key: 'entry_date', label: 'Date', render: (row) => prettyDate(row.entry_date) },
          { key: 'reference', label: 'Reference' },
          { key: 'memo', label: 'Memo' },
          { key: 'source', label: 'Source' },
          { key: 'amount', label: 'Amount', align: 'right', render: (row) => ugx(row.amount) },
        ]} />
      </section>
      {canWrite(user.role, 'finance') ? (
        <form action={postJournalAction} className="card mt-4 p-4">
          <h2 className="section-title">Post a balanced journal</h2>
          <div className="form-grid">
            <label className="field"><span>Date</span><input type="date" name="entry_date" required /></label>
            <label className="field"><span>Reference</span><input name="reference" /></label>
            <label className="field"><span>Class</span><select name="cashflow"><option value="operating">Operating</option><option value="investing">Investing</option><option value="financing">Financing</option></select></label>
            <label className="field full"><span>Memo</span><input name="memo" /></label>
          </div>
          {[1, 2, 3, 4].map((line) => (
            <div className="mt-2 grid gap-2 md:grid-cols-3" key={line}>
              <select name={`account_${line}`} defaultValue=""><option value="">Account</option>{accounts.map((account) => <option key={account.code} value={account.code}>{account.code} {account.name}</option>)}</select>
              <input name={`debit_${line}`} placeholder="Debit" inputMode="decimal" />
              <input name={`credit_${line}`} placeholder="Credit" inputMode="decimal" />
            </div>
          ))}
          <button className="btn btn-primary mt-3" type="submit">Post journal</button>
        </form>
      ) : null}
    </div>
  )
}
