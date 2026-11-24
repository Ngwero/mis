import { dayBefore, sh } from './format'
import { all, get, insert, type DB, type Row } from './sql'

export const CASH_MODES: Record<string, string> = {
  cash: '1000',
  mobile_money: '1010',
  bank: '1020',
}

export const ACCOUNTS: [string, string, string][] = [
  ['1000', 'Cash on hand', 'asset'],
  ['1010', 'Mobile money', 'asset'],
  ['1020', 'Bank', 'asset'],
  ['1100', 'Produce inventory', 'asset'],
  ['1200', 'Member loans receivable', 'asset'],
  ['1300', 'Input loans receivable', 'asset'],
  ['1400', 'Input stock', 'asset'],
  ['1500', 'Trade receivables', 'asset'],
  ['2000', 'Member payables', 'liability'],
  ['2100', 'External loans', 'liability'],
  ['3000', 'Member share capital', 'equity'],
  ['3100', 'Retained earnings', 'equity'],
  ['4000', 'Produce sales', 'income'],
  ['4100', 'Interest income', 'income'],
  ['4200', 'Other income', 'income'],
  ['5000', 'Cost of produce sold', 'expense'],
  ['5200', 'Farmer support', 'expense'],
  ['5300', 'Operating expenses', 'expense'],
  ['5400', 'Salaries and NSSF', 'expense'],
  ['5500', 'Interest expense', 'expense'],
]

export type Balance = { code: string; name: string; type: string; debit: number; credit: number }

export function natural(row: Balance) {
  if (row.type === 'asset' || row.type === 'expense') return sh(row.debit - row.credit)
  return sh(row.credit - row.debit)
}

export function balances(db: DB, opts: { from?: string | null; to?: string | null } = {}) {
  const params: string[] = []
  let dateSql = ''
  if (opts.from) {
    dateSql += ' and j.entry_date >= ?'
    params.push(opts.from)
  }
  if (opts.to) {
    dateSql += ' and j.entry_date <= ?'
    params.push(opts.to)
  }
  return all<Balance>(
    db,
    `select a.code, a.name, a.type,
            coalesce(sum(x.debit), 0) as debit,
            coalesce(sum(x.credit), 0) as credit
     from accounts a
     left join (
       select l.account_id, l.debit, l.credit
       from journal_lines l
       join journals j on j.id = l.journal_id
       where 1 = 1 ${dateSql}
     ) x on x.account_id = a.id
     group by a.id
     order by a.code`,
    ...params,
  )
}

export function trialBalance(db: DB, to?: string) {
  const rows = balances(db, { to })
  const debit = sh(rows.reduce((sum, row) => sum + Number(row.debit), 0))
  const credit = sh(rows.reduce((sum, row) => sum + Number(row.credit), 0))
  return { rows, debit, credit, gap: sh(debit - credit) }
}

export type StatementLine = { label: string; amount: number; hint?: string }
export type StatementSection = { heading: string; lines: StatementLine[]; totalLabel: string; total: number }

export function incomeStatement(db: DB, from: string, to: string) {
  const rows = balances(db, { from, to })
  const income = rows.filter((row) => row.type === 'income' && natural(row) !== 0)
  const expenses = rows.filter((row) => row.type === 'expense' && natural(row) !== 0)
  const incomeTotal = sh(income.reduce((sum, row) => sum + natural(row), 0))
  const expenseTotal = sh(expenses.reduce((sum, row) => sum + natural(row), 0))
  return {
    title: 'Income statement',
    period: `${from} to ${to}`,
    sections: [
      {
        heading: 'Income',
        lines: income.map((row) => ({ label: row.name, amount: natural(row) })),
        totalLabel: 'Total income',
        total: incomeTotal,
      },
      {
        heading: 'Expenses',
        lines: expenses.map((row) => ({ label: row.name, amount: natural(row) })),
        totalLabel: 'Total expenses',
        total: expenseTotal,
      },
    ] as StatementSection[],
    surplus: sh(incomeTotal - expenseTotal),
  }
}

export function balanceSheet(db: DB, to: string) {
  const rows = balances(db, { to })
  const assets = rows.filter((row) => row.type === 'asset')
  const liabilities = rows.filter((row) => row.type === 'liability')
  const equity = rows.filter((row) => row.type === 'equity')
  const incomeTotal = sh(rows.filter((row) => row.type === 'income').reduce((sum, row) => sum + natural(row), 0))
  const expenseTotal = sh(rows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + natural(row), 0))
  const surplus = sh(incomeTotal - expenseTotal)
  const assetTotal = sh(assets.reduce((sum, row) => sum + natural(row), 0))
  const liabilityTotal = sh(liabilities.reduce((sum, row) => sum + natural(row), 0))
  const equityTotal = sh(equity.reduce((sum, row) => sum + natural(row), 0))
  return {
    title: 'Balance sheet',
    period: `As at ${to}`,
    sections: [
      {
        heading: 'Assets',
        lines: assets.filter((row) => natural(row) !== 0).map((row) => ({ label: row.name, amount: natural(row) })),
        totalLabel: 'Total assets',
        total: assetTotal,
      },
      {
        heading: 'Liabilities',
        lines: liabilities.filter((row) => natural(row) !== 0).map((row) => ({ label: row.name, amount: natural(row) })),
        totalLabel: 'Total liabilities',
        total: liabilityTotal,
      },
      {
        heading: 'Equity',
        lines: [
          ...equity.filter((row) => natural(row) !== 0).map((row) => ({ label: row.name, amount: natural(row) })),
          { label: 'Current surplus', amount: surplus, hint: 'Income less expenses, not yet closed into retained earnings' },
        ],
        totalLabel: 'Total equity',
        total: sh(equityTotal + surplus),
      },
    ] as StatementSection[],
    gap: sh(assetTotal - (liabilityTotal + equityTotal + surplus)),
  }
}

export function cashFlow(db: DB, from: string, to: string) {
  const openingRows = balances(db, { to: dayBefore(from) })
  const closingRows = balances(db, { to })
  const cashOf = (rows: Balance[]) =>
    sh(rows.filter((row) => ['1000', '1010', '1020'].includes(row.code)).reduce((sum, row) => sum + natural(row), 0))
  const opening = cashOf(openingRows)
  const closing = cashOf(closingRows)
  const moves = all<Row>(
    db,
    `select j.cashflow as class,
            sum(case when a.code in ('1000','1010','1020') then l.debit - l.credit else 0 end) as net
     from journals j
     join journal_lines l on l.journal_id = j.id
     join accounts a on a.id = l.account_id
     where j.entry_date >= ? and j.entry_date <= ?
     group by j.cashflow`,
    from,
    to,
  )
  const byClass: Record<string, number> = {}
  for (const move of moves) byClass[String(move.class)] = sh(Number(move.net))
  const operating = byClass.operating || 0
  const investing = byClass.investing || 0
  const financing = byClass.financing || 0
  const other = sh(
    Object.entries(byClass)
      .filter(([key]) => !['operating', 'investing', 'financing'].includes(key))
      .reduce((sum, [, value]) => sum + value, 0),
  )
  const accounts = closingRows
    .filter((row) => ['1000', '1010', '1020'].includes(row.code))
    .map((row) => ({ label: row.name, amount: natural(row) }))
  return {
    title: 'Cash flow statement',
    period: `${from} to ${to}`,
    opening,
    operating,
    investing,
    financing,
    other,
    closing,
    gap: sh(opening + operating + investing + financing + other - closing),
    accounts,
  }
}

export type JournalLine = { account: string; debit?: number; credit?: number }

export function postJournal(
  db: DB,
  entry: {
    date: string
    reference?: string | null
    memo?: string | null
    source: string
    sourceId?: number | null
    cashflow: string
    userId?: number | null
    lines: JournalLine[]
  },
) {
  const accounts = all<{ id: number; code: string }>(db, 'select id, code from accounts')
  const ids = new Map(accounts.map((account) => [account.code, account.id]))
  const lines = entry.lines.map((line) => {
    const debit = sh(line.debit || 0)
    const credit = sh(line.credit || 0)
    if (!ids.has(line.account)) throw new Error(`Unknown account ${line.account}`)
    if (debit < 0 || credit < 0) throw new Error('Amounts cannot be negative')
    if (debit && credit) throw new Error('A line cannot be both a debit and a credit')
    if (!debit && !credit) throw new Error('A journal line needs an amount')
    return { accountId: ids.get(line.account) as number, debit, credit }
  })
  const debit = sh(lines.reduce((sum, line) => sum + line.debit, 0))
  const credit = sh(lines.reduce((sum, line) => sum + line.credit, 0))
  if (!debit) throw new Error('A journal needs an amount')
  if (debit !== credit) throw new Error(`Entry ${entry.reference || ''} is out of balance (${debit} vs ${credit}).`)
  const journalId = insert(db, 'journals', {
    entry_date: entry.date,
    reference: entry.reference || null,
    memo: entry.memo || null,
    source: entry.source,
    source_id: entry.sourceId ?? null,
    cashflow: entry.cashflow,
    created_by: entry.userId ?? null,
  }).id
  for (const line of lines) {
    insert(db, 'journal_lines', {
      journal_id: journalId,
      account_id: line.accountId,
      debit: line.debit,
      credit: line.credit,
    })
  }
  return journalId
}

export function accountBalance(db: DB, code: string, to?: string) {
  const row = balances(db, { to }).find((item) => item.code === code)
  return row ? natural(row) : 0
}

export function modeAccount(mode: string) {
  const code = CASH_MODES[mode]
  if (!code) throw new Error('Choose cash, mobile money, or bank.')
  return code
}

export function payableControl(db: DB) {
  const book = accountBalance(db, '2000')
  const opening = Number(get<{ s: number }>(db, 'select coalesce(sum(opening_payable),0) as s from farmers')?.s || 0)
  const openingPaid = Number(
    get<{ s: number }>(db, "select coalesce(sum(amount),0) as s from payments where applied_to = 'opening'")?.s || 0,
  )
  const gross = Number(get<{ s: number }>(db, 'select coalesce(sum(gross_amount),0) as s from collections')?.s || 0)
  const paid = Number(
    get<{ s: number }>(db, "select coalesce(sum(amount),0) as s from payments where applied_to = 'collection'")?.s || 0,
  )
  return { book, subledger: sh(opening - openingPaid + gross - paid) }
}
