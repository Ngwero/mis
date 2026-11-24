import { balanceSheet, cashFlow, incomeStatement } from './finance'
import { canSeeReport } from './rbac'
import { all, type DB, type Row } from './sql'

export type ReportColumn = { key: string; label: string; align?: 'right'; format?: 'money' | 'kg' | 'date' | 'text' }
export type ReportFilters = { from?: string; to?: string; group?: string; produce?: string; q?: string }

export const REPORTS = [
  { slug: 'farmer-register', title: 'Farmer register', group: 'People', blurb: 'Members, groups, contacts, and who recorded them.' },
  { slug: 'staff-register', title: 'Staff register', group: 'People', blurb: 'Employment, location, position, and additional information.' },
  { slug: 'shares', title: 'Share register', group: 'People', blurb: 'Certificates, paid-up capital, and calls in arrears.' },
  { slug: 'gardens', title: 'Garden register', group: 'Field', blurb: 'Size, GPS, altitude, variety, age, and expected harvest.' },
  { slug: 'training', title: 'Training attendance', group: 'Field', blurb: 'Topic, group, name, gender, age, and contact.' },
  { slug: 'councils', title: 'Youth and women councils', group: 'People', blurb: 'Council roles and member contacts.' },
  { slug: 'collections', title: 'Collections and quality payment', group: 'Produce', blurb: 'Volumes, grades, premiums, and balances by farmer, group, and centre.' },
  { slug: 'traceability', title: 'Batch genealogy', group: 'Produce', blurb: 'Every batch with the traces it came from.' },
  { slug: 'payments', title: 'Farmer payments', group: 'Produce', blurb: 'Amounts paid, mode, and the delivery they settle.' },
  { slug: 'sales', title: 'Produce sales', group: 'Produce', blurb: 'Buyers, lots, and individual farmer sales.' },
  { slug: 'stock', title: 'Stock position', group: 'Produce', blurb: 'Quantity and value by produce state.' },
  { slug: 'inputs', title: 'Inputs issued', group: 'Produce', blurb: 'Equipment, loans, cash, and grants issued to members.' },
  { slug: 'loans', title: 'Loan portfolio', group: 'Finance', blurb: 'Facilities, smallholder loans, interest, and balances.' },
  { slug: 'payroll', title: 'Payroll', group: 'Finance', blurb: 'Net pay and illustrative statutory deductions.' },
  { slug: 'communications', title: 'Messages', group: 'Engage', blurb: 'Advisory and delivery messages by language.' },
  { slug: 'income-statement', title: 'Income statement', group: 'Finance', blurb: 'Income, expenses, and surplus for the selected period.' },
  { slug: 'balance-sheet', title: 'Balance sheet', group: 'Finance', blurb: 'Assets, liabilities, and equity at the selected date.' },
  { slug: 'cash-flow', title: 'Cash flow', group: 'Finance', blurb: 'Opening cash, movements, and closing cash.' },
]

type Built = {
  slug: string
  title: string
  description: string
  columns: ReportColumn[]
  rows: Row[]
  chart?: { title: string; data: { label: string; value: number }[] }
  kind: 'table' | 'statement'
  statement?: unknown
}

function filters(input: ReportFilters) {
  return {
    from: input.from || '',
    to: input.to || '',
    group: input.group || '',
    produce: input.produce || '',
    q: input.q || '',
  }
}

export function getReport(db: DB, slug: string, input: ReportFilters, role: string): Built | null {
  const meta = REPORTS.find((item) => item.slug === slug)
  if (!meta) return null
  if (!canSeeReport(role, slug)) throw new Error('Your role cannot open this report.')
  const f = filters(input)
  if (slug === 'income-statement' || slug === 'balance-sheet' || slug === 'cash-flow') {
    return statementReport(db, slug, meta.title, meta.blurb, f)
  }
  const built = builders[slug]?.(db, f)
  if (!built) return null
  return { slug, title: meta.title, description: meta.blurb, kind: 'table', ...built }
}

function statementReport(db: DB, slug: string, title: string, description: string, f: Required<ReportFilters>): Built {
  const from = f.from || '2026-07-01'
  const to = f.to || new Date().toISOString().slice(0, 10)
  if (slug === 'income-statement') {
    const statement = incomeStatement(db, from, to)
    const rows = statement.sections.flatMap((section) => [
      ...section.lines.map((line) => ({ section: section.heading, line: line.label, amount: line.amount })),
      { section: section.heading, line: section.totalLabel, amount: section.total },
    ])
    rows.push({ section: 'Result', line: 'Surplus', amount: statement.surplus })
    return { slug, title, description, kind: 'statement', statement, columns: moneyColumns(['section', 'line']), rows }
  }
  if (slug === 'balance-sheet') {
    const statement = balanceSheet(db, to)
    const rows = statement.sections.flatMap((section) => [
      ...section.lines.map((line) => ({ section: section.heading, line: line.label, amount: line.amount })),
      { section: section.heading, line: section.totalLabel, amount: section.total },
    ])
    rows.push({ section: 'Check', line: 'Out of balance', amount: statement.gap })
    return { slug, title, description, kind: 'statement', statement, columns: moneyColumns(['section', 'line']), rows }
  }
  const flow = cashFlow(db, from, to)
  const rows = [
    { line: 'Opening cash', amount: flow.opening },
    { line: 'Operating', amount: flow.operating },
    { line: 'Investing', amount: flow.investing },
    { line: 'Financing', amount: flow.financing },
    { line: 'Other', amount: flow.other },
    { line: 'Closing cash', amount: flow.closing },
    ...flow.accounts.map((account) => ({ line: account.label, amount: account.amount })),
  ]
  return {
    slug, title, description, kind: 'statement', statement: flow,
    columns: [
      { key: 'line', label: 'Line' },
      { key: 'amount', label: 'Amount', align: 'right', format: 'money' },
    ],
    rows,
  }
}

function moneyColumns(keys: string[]): ReportColumn[] {
  return [
    ...keys.map((key) => ({ key, label: key === 'line' ? 'Line' : 'Section' })),
    { key: 'amount', label: 'Amount', align: 'right' as const, format: 'money' as const },
  ]
}

const builders: Record<string, (db: DB, f: Required<ReportFilters>) => Omit<Built, 'slug' | 'title' | 'description' | 'kind'>> = {
  'farmer-register': (db, f) => ({
    columns: [
      { key: 'farmer_code', label: 'Code' },
      { key: 'name', label: 'Farmer' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age', align: 'right' },
      { key: 'phone', label: 'Phone' },
      { key: 'group_name', label: 'Group' },
      { key: 'village', label: 'Village' },
      { key: 'main_enterprise', label: 'Enterprise' },
      { key: 'pwd', label: 'PWD' },
      { key: 'recorded_by', label: 'Recorded by' },
      { key: 'status', label: 'Status' },
    ],
    rows: all(db, `select f.farmer_code, f.first_name || ' ' || f.last_name as name, f.gender,
      cast((julianday('now') - julianday(f.dob)) / 365.25 as int) as age, f.phone,
      g.name as group_name, f.village, f.main_enterprise,
      case when f.pwd = 1 then 'Yes' else 'No' end as pwd,
      coalesce(u.name, f.recorded_by_name) as recorded_by, f.status
      from farmers f
      left join groups g on g.id = f.group_id
      left join users u on u.id = f.added_by
      where (? = '' or g.code = ?)
        and (? = '' or f.first_name || ' ' || f.last_name || ' ' || f.farmer_code || ' ' || ifnull(f.phone,'') like ?)
      order by f.farmer_code`, f.group, f.group, f.q, `%${f.q}%`),
    chart: {
      title: 'Members by gender',
      data: all<{ label: string; value: number }>(db, `select coalesce(gender,'Unspecified') as label, count(*) as value from farmers group by gender`),
    },
  }),
  'staff-register': (db, f) => ({
    columns: [
      { key: 'employee_no', label: 'No.' },
      { key: 'name', label: 'Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'position', label: 'Position' },
      { key: 'department', label: 'Department' },
      { key: 'phone', label: 'Phone' },
      { key: 'village', label: 'Village' },
      { key: 'contract_type', label: 'Contract' },
      { key: 'pay', label: 'Monthly pay', align: 'right', format: 'money' },
      { key: 'pwd', label: 'PWD' },
      { key: 'status', label: 'Status' },
    ],
    rows: all(db, `select employee_no, first_name || ' ' || last_name as name, gender, position, department, phone, village,
      contract_type, basic_salary + allowances as pay, case when pwd = 1 then 'Yes' else 'No' end as pwd, status
      from staff
      where (? = '' or first_name || ' ' || last_name || ' ' || ifnull(position,'') like ?)
      order by employee_no`, f.q, `%${f.q}%`),
  }),
  shares: (db, f) => ({
    columns: [
      { key: 'certificate_no', label: 'Certificate' },
      { key: 'name', label: 'Member' },
      { key: 'group_name', label: 'Group' },
      { key: 'class_name', label: 'Class' },
      { key: 'share_count', label: 'Shares', align: 'right' },
      { key: 'nominal_value', label: 'Nominal', align: 'right', format: 'money' },
      { key: 'amount_paid', label: 'Paid', align: 'right', format: 'money' },
      { key: 'unpaid', label: 'Unpaid', align: 'right', format: 'money' },
      { key: 'issued_on', label: 'Issued', format: 'date' },
    ],
    rows: all(db, `select s.certificate_no, f.first_name || ' ' || f.last_name as name, g.name as group_name, s.class_name,
      s.share_count, s.nominal_value, s.amount_paid, s.share_count * s.nominal_value - s.amount_paid as unpaid, s.issued_on
      from shares s join farmers f on f.id = s.farmer_id left join groups g on g.id = f.group_id
      where (? = '' or g.code = ?)
      order by s.certificate_no`, f.group, f.group),
    chart: {
      title: 'Paid-up capital by group',
      data: all(db, `select coalesce(g.name,'No group') as label, sum(s.amount_paid) as value
        from shares s join farmers f on f.id = s.farmer_id left join groups g on g.id = f.group_id
        group by g.name order by value desc`),
    },
  }),
  gardens: (db, f) => ({
    columns: [
      { key: 'name', label: 'Garden' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'group_name', label: 'Group' },
      { key: 'size_ha', label: 'Hectares', align: 'right' },
      { key: 'village', label: 'Village' },
      { key: 'altitude_m', label: 'Altitude m', align: 'right' },
      { key: 'gps', label: 'GPS' },
      { key: 'produce', label: 'Produce' },
      { key: 'variety', label: 'Variety' },
      { key: 'field_age_years', label: 'Field age', align: 'right' },
      { key: 'expected_harvest', label: 'Expected harvest', format: 'date' },
      { key: 'expected_yield_kg', label: 'Expected kg', align: 'right' },
    ],
    rows: all(db, `select gd.name, f.first_name || ' ' || f.last_name as farmer, g.name as group_name, gd.size_ha, gd.village,
      gd.altitude_m, case when gd.latitude is null then '' else printf('%.5f, %.5f', gd.latitude, gd.longitude) end as gps,
      gd.produce, gd.variety, gd.field_age_years, gd.expected_harvest, gd.expected_yield_kg
      from gardens gd join farmers f on f.id = gd.farmer_id left join groups g on g.id = f.group_id
      where (? = '' or g.code = ?) and (? = '' or gd.produce = ?)
        and (? = '' or gd.name || ' ' || f.first_name || ' ' || f.last_name like ?)
      order by f.farmer_code, gd.name`, f.group, f.group, f.produce, f.produce, f.q, `%${f.q}%`),
  }),
  training: (db, f) => ({
    columns: [
      { key: 'training_date', label: 'Date', format: 'date' },
      { key: 'topic', label: 'Topic' },
      { key: 'trainers', label: 'Trainers' },
      { key: 'group_name', label: 'Group' },
      { key: 'person_name', label: 'Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age', align: 'right' },
      { key: 'phone', label: 'Contact' },
      { key: 'kind', label: 'Kind' },
    ],
    rows: all(db, `select t.training_date, t.topic, t.trainers, a.group_name, a.person_name, a.gender, a.age, a.phone,
      case when a.is_representative = 1 then 'Representative' else 'Member' end as kind
      from training_attendees a join trainings t on t.id = a.training_id
      where (? = '' or t.training_date >= ?) and (? = '' or t.training_date <= ?)
        and (? = '' or t.topic || ' ' || a.person_name like ?)
      order by t.training_date, a.person_name`, f.from, f.from, f.to, f.to, f.q, `%${f.q}%`),
    chart: {
      title: 'Attendees by gender',
      data: all(db, `select coalesce(a.gender,'Unspecified') as label, count(*) as value
        from training_attendees a join trainings t on t.id = a.training_id
        where (? = '' or t.training_date >= ?) and (? = '' or t.training_date <= ?)
        group by a.gender`, f.from, f.from, f.to, f.to),
    },
  }),
  councils: (db) => ({
    columns: [
      { key: 'council', label: 'Council' },
      { key: 'kind', label: 'Type' },
      { key: 'role', label: 'Role' },
      { key: 'member_name', label: 'Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'phone', label: 'Phone' },
      { key: 'started_on', label: 'Started', format: 'date' },
    ],
    rows: all(db, `select c.name as council, c.kind, m.role, m.member_name, m.gender, m.phone, m.started_on
      from council_members m join councils c on c.id = m.council_id
      order by c.kind, c.name, m.role`),
  }),
  collections: (db, f) => ({
    columns: [
      { key: 'collection_date', label: 'Date', format: 'date' },
      { key: 'receipt_no', label: 'Receipt' },
      { key: 'trace_code', label: 'Trace' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'group_name', label: 'Group' },
      { key: 'centre', label: 'Centre' },
      { key: 'produce', label: 'Produce' },
      { key: 'grade', label: 'Grade' },
      { key: 'volume_kg', label: 'Kg', align: 'right', format: 'kg' },
      { key: 'unit_price', label: 'Price', align: 'right', format: 'money' },
      { key: 'premium', label: 'Premium', align: 'right', format: 'money' },
      { key: 'gross_amount', label: 'Due', align: 'right', format: 'money' },
      { key: 'balance', label: 'Unpaid', align: 'right', format: 'money' },
      { key: 'payment_status', label: 'Status' },
    ],
    rows: all(db, `select c.collection_date, c.receipt_no, c.trace_code, f.first_name || ' ' || f.last_name as farmer,
      g.name as group_name, b.name as centre, c.produce, c.grade, c.volume_kg, c.unit_price, c.premium, c.gross_amount,
      c.gross_amount - c.amount_paid as balance, c.payment_status
      from collections c
      join farmers f on f.id = c.farmer_id
      left join groups g on g.id = c.group_id
      left join bulking_centres b on b.id = c.centre_id
      where (? = '' or c.collection_date >= ?) and (? = '' or c.collection_date <= ?)
        and (? = '' or g.code = ?) and (? = '' or c.produce = ?)
        and (? = '' or f.first_name || ' ' || f.last_name || ' ' || c.trace_code || ' ' || c.receipt_no like ?)
      order by c.collection_date, c.id`, f.from, f.from, f.to, f.to, f.group, f.group, f.produce, f.produce, f.q, `%${f.q}%`),
    chart: {
      title: 'Kilograms by group',
      data: all(db, `select coalesce(g.name,'Ungrouped') as label, sum(c.volume_kg) as value
        from collections c left join groups g on g.id = c.group_id
        where (? = '' or c.collection_date >= ?) and (? = '' or c.collection_date <= ?) and (? = '' or c.produce = ?)
        group by g.name order by value desc`, f.from, f.from, f.to, f.to, f.produce, f.produce),
    },
  }),
  traceability: (db, f) => ({
    columns: [
      { key: 'trace_code', label: 'Trace' },
      { key: 'batch_code', label: 'Batch' },
      { key: 'produce', label: 'Produce' },
      { key: 'state', label: 'State' },
      { key: 'qty', label: 'Kg on hand', align: 'right', format: 'kg' },
      { key: 'total_cost', label: 'Value', align: 'right', format: 'money' },
      { key: 'location', label: 'Location' },
      { key: 'parents', label: 'Came from' },
      { key: 'received_on', label: 'Date', format: 'date' },
    ],
    rows: all(db, `select b.trace_code, b.batch_code, b.produce, b.state, b.qty, b.total_cost, b.location, b.received_on,
      coalesce((select group_concat(p.trace_code, ', ') from conversion_inputs ci
        join conversions c on c.id = ci.conversion_id join batches p on p.id = ci.batch_id
        where c.output_batch_id = b.id), b.trace_code) as parents
      from batches b
      where (? = '' or b.produce = ?) and (? = '' or b.trace_code || ' ' || b.batch_code || ' ' || ifnull(b.component_traces,'') like ?)
      order by b.received_on, b.id`, f.produce, f.produce, f.q, `%${f.q}%`),
  }),
  payments: (db, f) => ({
    columns: [
      { key: 'payment_date', label: 'Date', format: 'date' },
      { key: 'payment_no', label: 'Payment' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'group_name', label: 'Group' },
      { key: 'applied_to', label: 'Applied to' },
      { key: 'receipt_no', label: 'Receipt' },
      { key: 'direction', label: 'Direction' },
      { key: 'mode', label: 'Mode' },
      { key: 'amount', label: 'Amount', align: 'right', format: 'money' },
    ],
    rows: all(db, `select p.payment_date, p.payment_no, f.first_name || ' ' || f.last_name as farmer, g.name as group_name,
      p.applied_to, c.receipt_no, p.direction, p.mode, p.amount
      from payments p
      join farmers f on f.id = p.farmer_id
      left join groups g on g.id = f.group_id
      left join collections c on c.id = p.collection_id
      where (? = '' or p.payment_date >= ?) and (? = '' or p.payment_date <= ?) and (? = '' or g.code = ?)
      order by p.payment_date, p.id`, f.from, f.from, f.to, f.to, f.group, f.group),
  }),
  sales: (db, f) => ({
    columns: [
      { key: 'sale_date', label: 'Date', format: 'date' },
      { key: 'sale_no', label: 'Sale' },
      { key: 'buyer_name', label: 'Buyer' },
      { key: 'buyer_type', label: 'Buyer type' },
      { key: 'farmer', label: 'Farmer lot' },
      { key: 'produce', label: 'Produce' },
      { key: 'state', label: 'State' },
      { key: 'trace_code', label: 'Trace' },
      { key: 'qty', label: 'Kg', align: 'right', format: 'kg' },
      { key: 'total_amount', label: 'Amount', align: 'right', format: 'money' },
      { key: 'pay_mode', label: 'Mode' },
      { key: 'payment_status', label: 'Status' },
    ],
    rows: all(db, `select s.sale_date, s.sale_no, s.buyer_name, s.buyer_type,
      coalesce(f.first_name || ' ' || f.last_name, 'Bulk / prior stock') as farmer,
      s.produce, s.state, s.trace_code, s.qty, s.total_amount, s.pay_mode, s.payment_status
      from sales s left join farmers f on f.id = s.farmer_id
      where (? = '' or s.sale_date >= ?) and (? = '' or s.sale_date <= ?) and (? = '' or s.produce = ?)
      order by s.sale_date`, f.from, f.from, f.to, f.to, f.produce, f.produce),
  }),
  stock: (db, f) => ({
    columns: [
      { key: 'trace_code', label: 'Trace' },
      { key: 'produce', label: 'Produce' },
      { key: 'state', label: 'State' },
      { key: 'location', label: 'Location' },
      { key: 'qty', label: 'Kg', align: 'right', format: 'kg' },
      { key: 'total_cost', label: 'Value', align: 'right', format: 'money' },
    ],
    rows: all(db, `select trace_code, produce, state, location, qty, total_cost from batches
      where qty > 0.001 and (? = '' or produce = ?)
      order by produce, state, trace_code`, f.produce, f.produce),
    chart: {
      title: 'Kilograms on hand by state',
      data: all(db, `select state as label, sum(qty) as value from batches where qty > 0.001 and (? = '' or produce = ?) group by state`, f.produce, f.produce),
    },
  }),
  inputs: (db, f) => ({
    columns: [
      { key: 'issue_date', label: 'Date', format: 'date' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'item', label: 'Item' },
      { key: 'issue_type', label: 'Type' },
      { key: 'qty', label: 'Qty', align: 'right' },
      { key: 'amount', label: 'Value', align: 'right', format: 'money' },
      { key: 'notes', label: 'Notes' },
    ],
    rows: all(db, `select i.issue_date, f.first_name || ' ' || f.last_name as farmer, coalesce(it.name, 'Cash') as item,
      i.issue_type, i.qty, i.amount, i.notes
      from input_issues i join farmers f on f.id = i.farmer_id left join input_items it on it.id = i.item_id
      where (? = '' or i.issue_date >= ?) and (? = '' or i.issue_date <= ?)
      order by i.issue_date`, f.from, f.from, f.to, f.to),
  }),
  loans: (db) => ({
    columns: [
      { key: 'kind', label: 'Kind' },
      { key: 'code', label: 'Code' },
      { key: 'party', label: 'Beneficiary / funder' },
      { key: 'product', label: 'Product' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'money' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'money' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'money' },
      { key: 'rate', label: 'Rate %', align: 'right' },
      { key: 'due_on', label: 'Due', format: 'date' },
    ],
    rows: all(db, `select 'Smallholder' as kind, l.code, f.first_name || ' ' || f.last_name as party, p.name as product,
      l.principal, l.outstanding, l.interest_received as interest, l.interest_rate as rate, l.due_on
      from loans l join farmers f on f.id = l.farmer_id left join loan_products p on p.id = l.product_id
      union all
      select 'Facility', fa.code, fu.name, fa.name, fa.principal, fa.outstanding, fa.interest_paid, fa.interest_rate, fa.due_on
      from facilities fa left join funders fu on fu.id = fa.funder_id
      order by kind, code`),
    chart: {
      title: 'Outstanding by product',
      data: all(db, `select coalesce(p.name,'Facility') as label, sum(l.outstanding) as value
        from loans l left join loan_products p on p.id = l.product_id group by p.name`),
    },
  }),
  payroll: (db, f) => ({
    columns: [
      { key: 'period', label: 'Period' },
      { key: 'name', label: 'Staff' },
      { key: 'position', label: 'Position' },
      { key: 'basic', label: 'Basic', align: 'right', format: 'money' },
      { key: 'allowances', label: 'Allowances', align: 'right', format: 'money' },
      { key: 'nssf_employee', label: 'NSSF employee', align: 'right', format: 'money' },
      { key: 'nssf_employer', label: 'NSSF employer', align: 'right', format: 'money' },
      { key: 'paye', label: 'PAYE', align: 'right', format: 'money' },
      { key: 'net_pay', label: 'Net pay', align: 'right', format: 'money' },
    ],
    rows: all(db, `select p.period, s.first_name || ' ' || s.last_name as name, s.position, p.basic, p.allowances,
      p.nssf_employee, p.nssf_employer, p.paye, p.net_pay
      from payroll p join staff s on s.id = p.staff_id
      where (? = '' or p.period >= substr(?,1,7)) and (? = '' or p.period <= substr(?,1,7))
      order by p.period, s.employee_no`, f.from, f.from, f.to, f.to),
  }),
  communications: (db, f) => ({
    columns: [
      { key: 'created_at', label: 'When' },
      { key: 'language', label: 'Language' },
      { key: 'channel', label: 'Channel' },
      { key: 'event_type', label: 'Event' },
      { key: 'subject', label: 'Subject' },
      { key: 'recipients', label: 'Recipients', align: 'right' },
      { key: 'skipped_consent', label: 'Skipped', align: 'right' },
      { key: 'status', label: 'Status' },
    ],
    rows: all(db, `select m.created_at, m.language, m.channel, m.event_type, m.subject,
      (select count(*) from message_recipients r where r.message_id = m.id) as recipients,
      m.skipped_consent, m.status
      from messages m
      where (? = '' or substr(m.created_at,1,10) >= ?) and (? = '' or substr(m.created_at,1,10) <= ?)
      order by m.created_at desc`, f.from, f.from, f.to, f.to),
    chart: {
      title: 'Recorded messages by language',
      data: all(db, `select language as label, count(*) as value from messages group by language`),
    },
  }),
}
