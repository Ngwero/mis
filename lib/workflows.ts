import { ageOn, sh } from './format'
import {
  accountBalance,
  balanceSheet,
  cashFlow,
  modeAccount,
  payableControl,
  postJournal,
  trialBalance,
  type JournalLine,
} from './finance'
import { audit, get, insert, nextSeq, transaction, update, type DB } from './sql'

function personName(row: { first_name: string; last_name: string }) {
  return `${row.first_name} ${row.last_name}`
}

export function recordCollection(
  db: DB,
  input: {
    date: string
    farmerId: number
    gardenId?: number | null
    centreId: number
    produce: string
    grade: string
    volume: number
    moisture?: number | null
    defects?: number | null
    premium?: number | null
    notes?: string | null
    notify?: boolean
    language?: string
    traceCode?: string
    receiptNo?: string
    userId: number
  },
) {
  return transaction(db, () => {
    const farmer = get<any>(db, 'select * from farmers where id = ?', input.farmerId)
    if (!farmer || farmer.status === 'withdrawn') throw new Error('Choose an active member.')
    if (input.gardenId) {
      const garden = get<any>(db, 'select * from gardens where id = ?', input.gardenId)
      if (!garden || garden.farmer_id !== farmer.id) throw new Error('That garden does not belong to the selected member.')
    }
    const centre = get<any>(db, 'select * from bulking_centres where id = ?', input.centreId)
    if (!centre) throw new Error('Choose a bulking centre.')
    const volume = Number(input.volume)
    if (!(volume > 0)) throw new Error('Enter the quantity received.')
    const price = get<any>(
      db,
      `select * from price_schedules
       where produce = ? and grade = ? and effective_from <= ?
       order by effective_from desc, id desc limit 1`,
      input.produce,
      input.grade,
      input.date,
    )
    if (!price) throw new Error(`No price is set for ${input.produce} grade ${input.grade}. Add one under Settings.`)
    const premium = input.premium == null ? sh(price.default_premium) : sh(input.premium)
    if (premium < 0) throw new Error('The quality premium cannot be negative.')
    const unit = sh(price.unit_price)
    const gross = sh(volume * (unit + premium))
    if (gross <= 0) throw new Error('The amount due must be greater than zero.')
    const trace = input.traceCode || `RHC-26-${String(nextSeq(db, 'trace')).padStart(5, '0')}`
    const receipt = input.receiptNo || `RC-${10000 + nextSeq(db, 'receipt')}`
    const collectionId = insert(db, 'collections', {
      receipt_no: receipt,
      trace_code: trace,
      collection_date: input.date,
      farmer_id: farmer.id,
      group_id: farmer.group_id,
      garden_id: input.gardenId || null,
      centre_id: centre.id,
      produce: input.produce,
      grade: input.grade,
      volume_kg: volume,
      moisture: input.moisture ?? null,
      defects_pct: input.defects ?? null,
      unit_price: unit,
      premium,
      gross_amount: gross,
      amount_paid: 0,
      payment_status: 'unpaid',
      notes: input.notes || null,
      recorded_by: input.userId,
    }).id
    const batchId = insert(db, 'batches', {
      batch_code: `BT-${String(nextSeq(db, 'batch')).padStart(5, '0')}`,
      trace_code: trace,
      collection_id: collectionId,
      produce: input.produce,
      state: input.produce === 'Maize' ? 'grain' : 'cherry',
      qty: volume,
      total_cost: gross,
      location: centre.name,
      received_on: input.date,
      component_traces: JSON.stringify([trace]),
      notes: 'Received from member',
    }).id
    const journalId = postJournal(db, {
      date: input.date,
      reference: receipt,
      memo: `Produce received, ${volume} kg ${input.produce}, ${personName(farmer)}`,
      source: 'collection',
      sourceId: collectionId,
      cashflow: 'operating',
      userId: input.userId,
      lines: [
        { account: '1100', debit: gross },
        { account: '2000', credit: gross },
      ],
    })
    update(db, 'collections', collectionId, { batch_id: batchId, journal_id: journalId })
    let notice = ''
    if (input.notify) {
      const sent = logMessage(db, {
        userId: input.userId,
        language: input.language || 'English',
        channel: 'sms',
        subject: `Delivery ${receipt}`,
        body: deliveryMessage(input.language || 'English', {
          receipt,
          kg: volume,
          produce: input.produce,
          grade: input.grade,
          centre: centre.name,
          amount: gross,
          trace,
        }),
        audience: personName(farmer),
        eventType: 'delivery',
        eventId: collectionId,
        farmerIds: [farmer.id],
        createdAt: `${input.date}T09:00:00.000Z`,
      })
      notice = sent.recipients
        ? `A ${input.language || 'English'} delivery message was recorded.`
        : 'No message was recorded because this member has not agreed to SMS.'
    }
    audit(db, input.userId, 'create', 'collection', collectionId, { receipt, trace, gross })
    return { id: collectionId, gross, batchId, trace, receipt, notice }
  })
}

function deliveryMessage(
  language: string,
  data: { receipt: string; kg: number; produce: string; grade: string; centre: string; amount: number; trace: string },
) {
  if (language === 'Kiswahili') {
    return `Rwenzori Highland: risiti ${data.receipt}. Tumepokea kilo ${data.kg} za ${data.produce} (gredi ${data.grade}) katika ${data.centre}. Kiasi kinachodaiwa UGX ${data.amount.toLocaleString('en-US')}. Msimbo ${data.trace}.`
  }
  return `Rwenzori Highland: receipt ${data.receipt}. We received ${data.kg} kg ${data.produce} (${data.grade}) at ${data.centre}. Amount due UGX ${data.amount.toLocaleString('en-US')}. Trace ${data.trace}.`
}

function paymentMessage(language: string, data: { payment: string; amount: number; mode: string; name: string }) {
  const mode = data.mode.replace('_', ' ')
  if (language === 'Kiswahili') {
    return `Rwenzori Highland: malipo ${data.payment} ya UGX ${data.amount.toLocaleString('en-US')} kwa ${mode} yamerekodiwa kwa ${data.name}. Asante.`
  }
  return `Rwenzori Highland: payment ${data.payment} of UGX ${data.amount.toLocaleString('en-US')} by ${mode} has been recorded for ${data.name}. Thank you.`
}

export function logMessage(
  db: DB,
  input: {
    userId: number | null
    language: string
    channel: string
    subject: string
    body: string
    audience?: string | null
    eventType?: string | null
    eventId?: number | null
    farmerIds: number[]
    createdAt?: string
  },
) {
  const farmers = input.farmerIds.length ? getFarmers(db, input.farmerIds) : []
  const allowed = farmers.filter((farmer) => farmer.consent_sms && farmer.phone)
  const skipped = farmers.length - allowed.length
  if (!allowed.length) {
    return { id: 0, recipients: 0, skipped }
  }
  const id = insert(db, 'messages', {
    created_at: input.createdAt || new Date().toISOString(),
    channel: input.channel,
    language: input.language,
    subject: input.subject,
    body: input.body,
    audience: input.audience || null,
    event_type: input.eventType || null,
    event_id: input.eventId ?? null,
    status: 'recorded',
    skipped_consent: skipped,
    created_by: input.userId,
  }).id
  for (const farmer of allowed) {
    insert(db, 'message_recipients', {
      message_id: id,
      farmer_id: farmer.id,
      phone: farmer.phone,
      name: personName(farmer),
      status: 'recorded',
    })
  }
  audit(db, input.userId, 'create', 'message', id, { recipients: allowed.length, skipped, language: input.language })
  return { id, recipients: allowed.length, skipped }
}

function getFarmers(db: DB, ids: number[]) {
  const marks = ids.map(() => '?').join(',')
  return ids.length
    ? (db.prepare(`select * from farmers where id in (${marks})`).all(...ids).map((row) => ({ ...row })) as any[])
    : []
}

export function recordPayment(
  db: DB,
  input: {
    date: string
    farmerId: number
    appliedTo: 'collection' | 'opening' | 'other'
    collectionId?: number | null
    direction?: 'to_farmer' | 'from_farmer'
    mode: string
    amount: number
    notes?: string | null
    notify?: boolean
    language?: string
    userId: number
  },
) {
  return transaction(db, () => {
    const farmer = get<any>(db, 'select * from farmers where id = ?', input.farmerId)
    if (!farmer) throw new Error('Choose a member.')
    const amount = sh(input.amount)
    if (amount <= 0) throw new Error('Enter the amount.')
    const direction = input.appliedTo === 'other' ? input.direction || 'to_farmer' : 'to_farmer'
    let collection: any = null
    if (input.appliedTo === 'collection') {
      collection = get<any>(db, 'select * from collections where id = ?', input.collectionId)
      if (!collection || collection.farmer_id !== farmer.id) throw new Error('Choose a delivery for this member.')
      const remaining = sh(collection.gross_amount - collection.amount_paid)
      if (amount > remaining) throw new Error(`The unpaid balance on ${collection.receipt_no} is UGX ${remaining.toLocaleString('en-US')}.`)
    }
    if (input.appliedTo === 'opening') {
      const paid = Number(
        get<{ s: number }>(
          db,
          "select coalesce(sum(amount),0) as s from payments where farmer_id = ? and applied_to = 'opening'",
          farmer.id,
        )?.s || 0,
      )
      const remaining = sh(farmer.opening_payable - paid)
      if (amount > remaining) throw new Error(`The prior-season balance is UGX ${remaining.toLocaleString('en-US')}.`)
    }
    const paymentNo = `PM-${10000 + nextSeq(db, 'payment')}`
    const cash = modeAccount(input.mode)
    const lines =
      input.appliedTo === 'other'
        ? direction === 'to_farmer'
          ? [
              { account: '5200', debit: amount },
              { account: cash, credit: amount },
            ]
          : [
              { account: cash, debit: amount },
              { account: '4200', credit: amount },
            ]
        : direction === 'to_farmer'
          ? [
              { account: '2000', debit: amount },
              { account: cash, credit: amount },
            ]
          : [
              { account: cash, debit: amount },
              { account: '2000', credit: amount },
            ]
    const journalId = postJournal(db, {
      date: input.date,
      reference: paymentNo,
      memo: `Member payment, ${personName(farmer)}`,
      source: 'payment',
      cashflow: 'operating',
      userId: input.userId,
      lines,
    })
    const id = insert(db, 'payments', {
      payment_no: paymentNo,
      payment_date: input.date,
      farmer_id: farmer.id,
      applied_to: input.appliedTo,
      collection_id: collection?.id || null,
      direction,
      mode: input.mode,
      amount,
      notes: input.notes || null,
      recorded_by: input.userId,
      journal_id: journalId,
    }).id
    update(db, 'journals', journalId, { source_id: id })
    if (collection) {
      const paid = sh(collection.amount_paid + amount)
      const status = paid <= 0 ? 'unpaid' : paid >= sh(collection.gross_amount) ? 'paid' : 'partial'
      update(db, 'collections', collection.id, { amount_paid: paid, payment_status: status })
    }
    let notice = ''
    if (input.notify) {
      const sent = logMessage(db, {
        userId: input.userId,
        language: input.language || 'English',
        channel: 'sms',
        subject: `Payment ${paymentNo}`,
        body: paymentMessage(input.language || 'English', {
          payment: paymentNo,
          amount,
          mode: input.mode,
          name: personName(farmer),
        }),
        audience: personName(farmer),
        eventType: 'payment',
        eventId: id,
        farmerIds: [farmer.id],
        createdAt: `${input.date}T15:00:00.000Z`,
      })
      notice = sent.recipients
        ? 'A payment message was recorded.'
        : 'No message was recorded because this member has not agreed to SMS.'
    }
    audit(db, input.userId, 'create', 'payment', id, { paymentNo, amount, appliedTo: input.appliedTo })
    return { id, paymentNo, notice }
  })
}

function takeBatchCost(db: DB, batchId: number, qty: number) {
  const batch = get<any>(db, 'select * from batches where id = ?', batchId)
  if (!batch) throw new Error('A selected batch no longer exists.')
  if (!(qty > 0)) throw new Error('Enter a quantity for each batch.')
  if (qty - Number(batch.qty) > 0.0001) throw new Error(`${batch.trace_code} has only ${batch.qty} kg left.`)
  const allOfIt = Math.abs(qty - Number(batch.qty)) < 0.0001
  const cost = allOfIt ? sh(batch.total_cost) : sh((Number(batch.total_cost) * qty) / Number(batch.qty))
  update(db, 'batches', batch.id, {
    qty: Number(batch.qty) - qty,
    total_cost: sh(Number(batch.total_cost) - cost),
  })
  return { batch, cost }
}

export function convertStock(
  db: DB,
  input: {
    date: string
    process: string
    outputState: string
    location: string
    outputQty: number
    inputs: { batchId: number; qty: number }[]
    processCost?: number
    payFrom?: string
    notes?: string | null
    outputTrace?: string
    userId: number
  },
) {
  return transaction(db, () => {
    if (!input.inputs.length) throw new Error('Choose at least one batch to convert.')
    if (!(input.outputQty > 0)) throw new Error('Enter the output quantity.')
    const processCost = sh(input.processCost || 0)
    if (processCost < 0) throw new Error('Processing cost cannot be negative.')
    const taken = input.inputs.map((item) => takeBatchCost(db, item.batchId, Number(item.qty)))
    const produce = taken[0].batch.produce
    if (taken.some((item) => item.batch.produce !== produce)) {
      throw new Error('Blend only batches of the same produce.')
    }
    const inputCost = sh(taken.reduce((sum, item) => sum + item.cost, 0))
    const outputCost = sh(inputCost + processCost)
    const lines: JournalLine[] = [
      { account: '1100', debit: outputCost },
      { account: '1100', credit: inputCost },
    ]
    if (processCost) lines.push({ account: modeAccount(input.payFrom || 'cash'), credit: processCost })
    const traces = taken.flatMap((item) => {
      try {
        const parsed = JSON.parse(item.batch.component_traces || '[]')
        return Array.isArray(parsed) ? parsed : [item.batch.trace_code]
      } catch {
        return [item.batch.trace_code]
      }
    })
    const trace = input.outputTrace || `RHC-26-C${String(nextSeq(db, 'convert')).padStart(4, '0')}`
    const batchId = insert(db, 'batches', {
      batch_code: `BT-${String(nextSeq(db, 'batch')).padStart(5, '0')}`,
      trace_code: trace,
      produce,
      state: input.outputState,
      qty: input.outputQty,
      total_cost: outputCost,
      location: input.location,
      received_on: input.date,
      component_traces: JSON.stringify([...new Set(traces)]),
      notes: input.notes || input.process,
    }).id
    const journalId = postJournal(db, {
      date: input.date,
      reference: trace,
      memo: `${input.process}: ${produce} to ${input.outputState}`,
      source: 'conversion',
      cashflow: 'operating',
      userId: input.userId,
      lines,
    })
    const conversionId = insert(db, 'conversions', {
      conv_date: input.date,
      process: input.process,
      output_batch_id: batchId,
      process_cost: processCost,
      output_qty: input.outputQty,
      notes: input.notes || null,
      done_by: input.userId,
      journal_id: journalId,
    }).id
    for (const item of taken) {
      insert(db, 'conversion_inputs', {
        conversion_id: conversionId,
        batch_id: item.batch.id,
        qty: item.batch ? Number(input.inputs.find((row) => row.batchId === item.batch.id)?.qty) : 0,
        cost: item.cost,
      })
    }
    audit(db, input.userId, 'create', 'conversion', conversionId, { trace, process: input.process, outputQty: input.outputQty })
    return { conversionId, batchId, trace, qty: input.outputQty, cost: outputCost }
  })
}

export function recordSale(
  db: DB,
  input: {
    date: string
    buyerName: string
    buyerContact?: string | null
    buyerType?: string | null
    batchId: number
    qty: number
    unitPrice: number
    mode: string
    farmerId?: number | null
    notes?: string | null
    userId: number
  },
) {
  return transaction(db, () => {
    if (!input.buyerName.trim()) throw new Error('Enter the buyer.')
    const unitPrice = sh(input.unitPrice)
    if (unitPrice <= 0) throw new Error('Enter the selling price per kg.')
    const batch = get<any>(db, 'select * from batches where id = ?', input.batchId)
    if (!batch) throw new Error('Choose a batch.')
    const taken = takeBatchCost(db, batch.id, Number(input.qty))
    const total = sh(Number(input.qty) * unitPrice)
    const credit = input.mode === 'credit'
    const lines = [
      { account: credit ? '1500' : modeAccount(input.mode), debit: total },
      { account: '4000', credit: total },
      { account: '5000', debit: taken.cost },
      { account: '1100', credit: taken.cost },
    ]
    const saleNo = `SL-${10000 + nextSeq(db, 'sale')}`
    const journalId = postJournal(db, {
      date: input.date,
      reference: saleNo,
      memo: `Sale to ${input.buyerName}`,
      source: 'sale',
      cashflow: 'operating',
      userId: input.userId,
      lines,
    })
    const id = insert(db, 'sales', {
      sale_no: saleNo,
      sale_date: input.date,
      buyer_name: input.buyerName.trim(),
      buyer_contact: input.buyerContact || null,
      buyer_type: input.buyerType || null,
      batch_id: batch.id,
      farmer_id: input.farmerId || null,
      produce: batch.produce,
      state: batch.state,
      trace_code: batch.trace_code,
      qty: Number(input.qty),
      unit_price: unitPrice,
      total_amount: total,
      cogs: taken.cost,
      pay_mode: input.mode,
      payment_status: credit ? 'unpaid' : 'paid',
      notes: input.notes || null,
      recorded_by: input.userId,
      journal_id: journalId,
    }).id
    update(db, 'journals', journalId, { source_id: id })
    audit(db, input.userId, 'create', 'sale', id, { saleNo, total, cogs: taken.cost })
    return { id, saleNo, total, cogs: taken.cost }
  })
}

export function receiveSale(db: DB, input: { saleId: number; date: string; mode: string; userId: number }) {
  return transaction(db, () => {
    const sale = get<any>(db, 'select * from sales where id = ?', input.saleId)
    if (!sale) throw new Error('Sale not found.')
    if (sale.payment_status === 'paid') throw new Error('This sale is already paid.')
    const receipt = `SR-${10000 + nextSeq(db, 'sale_receipt')}`
    postJournal(db, {
      date: input.date,
      reference: receipt,
      memo: `Receipt for ${sale.sale_no}`,
      source: 'sale',
      sourceId: sale.id,
      cashflow: 'operating',
      userId: input.userId,
      lines: [
        { account: modeAccount(input.mode), debit: sh(sale.total_amount) },
        { account: '1500', credit: sh(sale.total_amount) },
      ],
    })
    update(db, 'sales', sale.id, { payment_status: 'paid', pay_mode: input.mode })
    audit(db, input.userId, 'receive', 'sale', sale.id, { receipt })
    return { receipt }
  })
}

export function createShare(
  db: DB,
  input: {
    farmerId: number
    certificateNo?: string
    className: string
    shareCount: number
    nominalValue: number
    amountPaid: number
    issuedOn: string
    payMode?: string | null
    notes?: string | null
    userId: number
  },
) {
  return transaction(db, () => {
    const shares = Math.round(Number(input.shareCount))
    const nominal = sh(input.nominalValue)
    const paid = sh(input.amountPaid)
    if (shares <= 0 || nominal <= 0) throw new Error('Enter the number of shares and the nominal value.')
    if (paid < 0 || paid > shares * nominal) throw new Error('Amount paid cannot exceed the nominal value of the shares.')
    const farmer = get<any>(db, 'select * from farmers where id = ?', input.farmerId)
    if (!farmer) throw new Error('Choose a member.')
    const certificate = input.certificateNo || `SH-${String(nextSeq(db, 'share')).padStart(4, '0')}`
    const id = insert(db, 'shares', {
      farmer_id: farmer.id,
      certificate_no: certificate,
      class_name: input.className || 'Ordinary',
      share_count: shares,
      nominal_value: nominal,
      amount_paid: paid,
      issued_on: input.issuedOn,
      pay_mode: input.payMode || null,
      notes: input.notes || null,
    }).id
    if (paid > 0) {
      if (!input.payMode) throw new Error('Choose how the share money was received.')
      postJournal(db, {
        date: input.issuedOn,
        reference: certificate,
        memo: `Share capital, ${personName(farmer)}`,
        source: 'share',
        sourceId: id,
        cashflow: 'financing',
        userId: input.userId,
        lines: [
          { account: modeAccount(input.payMode), debit: paid },
          { account: '3000', credit: paid },
        ],
      })
    }
    audit(db, input.userId, 'create', 'share', id, { certificate, paid })
    return { id, certificate }
  })
}

export function disburseLoan(
  db: DB,
  input: {
    productId: number
    farmerId: number
    principal: number
    date: string
    due: string
    purpose?: string | null
    payFrom: string
    userId: number
    code?: string
  },
) {
  return transaction(db, () => {
    const product = get<any>(db, 'select * from loan_products where id = ?', input.productId)
    if (!product) throw new Error('Choose a loan product.')
    const farmer = get<any>(db, 'select * from farmers where id = ?', input.farmerId)
    if (!farmer) throw new Error('Choose a member.')
    const principal = sh(input.principal)
    if (principal <= 0) throw new Error('Enter the principal.')
    if (product.max_amount && principal > product.max_amount) {
      throw new Error(`This product is limited to UGX ${sh(product.max_amount).toLocaleString('en-US')}.`)
    }
    const code = input.code || `LN-${10000 + nextSeq(db, 'loan')}`
    const id = insert(db, 'loans', {
      code,
      product_id: product.id,
      farmer_id: farmer.id,
      book: product.book,
      principal,
      outstanding: principal,
      interest_rate: product.interest_rate,
      interest_received: 0,
      disbursed_on: input.date,
      due_on: input.due || null,
      purpose: input.purpose || null,
      is_opening: 0,
      recorded_by: input.userId,
    }).id
    postJournal(db, {
      date: input.date,
      reference: code,
      memo: `Loan to ${personName(farmer)}`,
      source: 'loan',
      sourceId: id,
      cashflow: 'financing',
      userId: input.userId,
      lines: [
        { account: product.book === 'input' ? '1300' : '1200', debit: principal },
        { account: modeAccount(input.payFrom), credit: principal },
      ],
    })
    audit(db, input.userId, 'disburse', 'loan', id, { code, principal })
    return { id, code }
  })
}

export function repayLoan(
  db: DB,
  input: { loanId: number; date: string; principal: number; interest: number; mode: string; userId: number },
) {
  return transaction(db, () => {
    const loan = get<any>(db, 'select * from loans where id = ?', input.loanId)
    if (!loan) throw new Error('Choose a loan.')
    const principal = sh(input.principal)
    const interest = sh(input.interest)
    if (principal < 0 || interest < 0 || principal + interest <= 0) throw new Error('Enter the principal, the interest, or both.')
    if (principal > sh(loan.outstanding)) throw new Error('Principal repaid cannot exceed the outstanding balance.')
    const total = sh(principal + interest)
    const reference = `LR-${10000 + nextSeq(db, 'loan_receipt')}`
    const lines: { account: string; debit?: number; credit?: number }[] = [{ account: modeAccount(input.mode), debit: total }]
    if (principal) lines.push({ account: loan.book === 'input' ? '1300' : '1200', credit: principal })
    if (interest) lines.push({ account: '4100', credit: interest })
    postJournal(db, {
      date: input.date,
      reference,
      memo: `Loan repayment ${loan.code}`,
      source: 'repayment',
      sourceId: loan.id,
      cashflow: 'financing',
      userId: input.userId,
      lines,
    })
    update(db, 'loans', loan.id, {
      outstanding: sh(loan.outstanding - principal),
      interest_received: sh(loan.interest_received + interest),
    })
    audit(db, input.userId, 'repay', 'loan', loan.id, { principal, interest })
    return { reference }
  })
}

export function repayFacility(
  db: DB,
  input: { facilityId: number; date: string; principal: number; interest: number; mode: string; userId: number },
) {
  return transaction(db, () => {
    const facility = get<any>(db, 'select * from facilities where id = ?', input.facilityId)
    if (!facility) throw new Error('Choose a facility.')
    const principal = sh(input.principal)
    const interest = sh(input.interest)
    if (principal < 0 || interest < 0 || principal + interest <= 0) throw new Error('Enter the principal, the interest, or both.')
    if (principal > sh(facility.outstanding)) throw new Error('Principal repaid cannot exceed the outstanding facility.')
    const total = sh(principal + interest)
    const reference = `FR-${10000 + nextSeq(db, 'facility')}`
    const lines: { account: string; debit?: number; credit?: number }[] = [{ account: modeAccount(input.mode), credit: total }]
    if (principal) lines.push({ account: '2100', debit: principal })
    if (interest) lines.push({ account: '5500', debit: interest })
    postJournal(db, {
      date: input.date,
      reference,
      memo: `Facility repayment ${facility.code}`,
      source: 'facility',
      sourceId: facility.id,
      cashflow: 'financing',
      userId: input.userId,
      lines,
    })
    update(db, 'facilities', facility.id, {
      outstanding: sh(facility.outstanding - principal),
      interest_paid: sh(facility.interest_paid + interest),
    })
    audit(db, input.userId, 'repay', 'facility', facility.id, { principal, interest })
    return { reference }
  })
}

export function issueInput(
  db: DB,
  input: {
    date: string
    farmerId: number
    itemId?: number | null
    issueType: 'equipment' | 'loan' | 'cash' | 'grant'
    qty?: number | null
    amount?: number | null
    payFrom?: string
    due?: string | null
    notes?: string | null
    userId: number
  },
) {
  return transaction(db, () => {
    const farmer = get<any>(db, 'select * from farmers where id = ?', input.farmerId)
    if (!farmer) throw new Error('Choose a member.')
    const item = input.itemId ? get<any>(db, 'select * from input_items where id = ?', input.itemId) : null
    if (input.issueType !== 'cash' && !item) throw new Error('Choose an input item, or record a cash issue.')
    const qty = item ? Number(input.qty || 0) : 0
    if (item && !(qty > 0)) throw new Error('Enter the quantity issued.')
    if (item && qty - Number(item.qty_on_hand) > 0.0001) throw new Error(`${item.name} has only ${item.qty_on_hand} ${item.unit} in stock.`)
    const amount = item ? sh(qty * Number(item.unit_cost)) : sh(input.amount || 0)
    if (amount <= 0) throw new Error('Enter the value of the issue.')
    if (item) {
      const allOfIt = Math.abs(qty - Number(item.qty_on_hand)) < 0.0001
      update(db, 'input_items', item.id, { qty_on_hand: allOfIt ? 0 : Number(item.qty_on_hand) - qty })
    }
    let loanId: number | null = null
    const creditAccount = item ? '1400' : modeAccount(input.payFrom || 'cash')
    const debitAccount = input.issueType === 'grant' || input.issueType === 'equipment' ? '5200' : '1300'
    if (input.issueType === 'loan' || input.issueType === 'cash') {
      const product = get<any>(db, "select * from loan_products where book = 'input' order by id limit 1")
      loanId = insert(db, 'loans', {
        code: `LN-${10000 + nextSeq(db, 'loan')}`,
        product_id: product?.id || null,
        farmer_id: farmer.id,
        book: 'input',
        principal: amount,
        outstanding: amount,
        interest_rate: product?.interest_rate || 0,
        interest_received: 0,
        disbursed_on: input.date,
        due_on: input.due || null,
        purpose: input.notes || (item ? item.name : 'Cash advance'),
        is_opening: 0,
        recorded_by: input.userId,
      }).id
    }
    const journalId = postJournal(db, {
      date: input.date,
      reference: `IN-${10000 + nextSeq(db, 'input')}`,
      memo: `Input issued to ${personName(farmer)}`,
      source: 'input',
      cashflow: item ? 'operating' : 'financing',
      userId: input.userId,
      lines: [
        { account: debitAccount, debit: amount },
        { account: creditAccount, credit: amount },
      ],
    })
    const id = insert(db, 'input_issues', {
      issue_date: input.date,
      item_id: item?.id || null,
      farmer_id: farmer.id,
      issue_type: input.issueType,
      qty: item ? qty : null,
      amount,
      notes: input.notes || null,
      loan_id: loanId,
      issued_by: input.userId,
      journal_id: journalId,
    }).id
    audit(db, input.userId, 'issue', 'input', id, { amount, issueType: input.issueType })
    return { id, amount, loanId }
  })
}

export function runPayroll(db: DB, input: { period: string; paidOn: string; userId: number }) {
  return transaction(db, () => {
    if (!/^\d{4}-\d{2}$/.test(input.period)) throw new Error('Use a month in the form YYYY-MM.')
    const existing = get(db, 'select id from payroll where period = ? limit 1', input.period)
    if (existing) throw new Error('Payroll for that month has already been posted.')
    const staff = getActiveStaff(db)
    if (!staff.length) throw new Error('There are no active staff to pay.')
    const rows = staff.map((person) => {
      const basic = sh(person.basic_salary)
      const allowances = sh(person.allowances)
      const nssfEmployee = sh(basic * 0.05)
      const nssfEmployer = sh(basic * 0.1)
      const taxable = basic + allowances - nssfEmployee
      const paye = taxable > 1_000_000 ? sh(taxable * 0.1) : 0
      const net = sh(basic + allowances - nssfEmployee - paye)
      const expense = sh(basic + allowances + nssfEmployer)
      return { person, basic, allowances, nssfEmployee, nssfEmployer, paye, net, expense }
    })
    const total = sh(rows.reduce((sum, row) => sum + row.expense, 0))
    const journalId = postJournal(db, {
      date: input.paidOn,
      reference: `PAY-${input.period}`,
      memo: `Payroll ${input.period}. Illustrative NSSF and PAYE, paid with the net salary.`,
      source: 'payroll',
      cashflow: 'operating',
      userId: input.userId,
      lines: [
        { account: '5400', debit: total },
        { account: '1020', credit: total },
      ],
    })
    for (const row of rows) {
      insert(db, 'payroll', {
        staff_id: row.person.id,
        period: input.period,
        basic: row.basic,
        allowances: row.allowances,
        nssf_employee: row.nssfEmployee,
        nssf_employer: row.nssfEmployer,
        paye: row.paye,
        net_pay: row.net,
        expense: row.expense,
        paid_on: input.paidOn,
        journal_id: journalId,
      })
    }
    audit(db, input.userId, 'run', 'payroll', journalId, { period: input.period, total, count: rows.length })
    return { count: rows.length, total }
  })
}

function getActiveStaff(db: DB) {
  return db
    .prepare("select * from staff where status = 'active' order by employee_no")
    .all()
    .map((row) => ({ ...row })) as any[]
}

export function saveTraining(
  db: DB,
  input: {
    date: string
    audience: 'farmer' | 'staff'
    topic: string
    trainers?: string | null
    summary?: string | null
    location?: string | null
    language?: string | null
    notes?: string | null
    farmerIds: number[]
    staffIds: number[]
    reps: { name: string; phone?: string; gender?: string; dob?: string }[]
    userId: number
  },
) {
  return transaction(db, () => {
    if (!input.topic.trim()) throw new Error('Enter the topic.')
    const attendees: any[] = []
    if (input.audience === 'farmer') {
      for (const farmer of getFarmers(db, input.farmerIds)) {
        const group = farmer.group_id ? get<any>(db, 'select name from groups where id = ?', farmer.group_id) : null
        attendees.push({
          farmer_id: farmer.id,
          is_representative: 0,
          person_name: personName(farmer),
          group_name: group?.name || null,
          gender: farmer.gender,
          age: ageOn(farmer.dob, new Date(`${input.date}T00:00:00`)),
          phone: farmer.phone,
          dob: farmer.dob,
        })
      }
      for (const rep of input.reps) {
        if (!rep.name.trim()) continue
        attendees.push({
          is_representative: 1,
          person_name: rep.name.trim(),
          group_name: 'Representative',
          gender: rep.gender || null,
          age: ageOn(rep.dob, new Date(`${input.date}T00:00:00`)),
          phone: rep.phone || null,
          dob: rep.dob || null,
        })
      }
    } else {
      const ids = input.staffIds
      const marks = ids.map(() => '?').join(',')
      const people = ids.length
        ? (db.prepare(`select * from staff where id in (${marks})`).all(...ids).map((row) => ({ ...row })) as any[])
        : []
      for (const person of people) {
        attendees.push({
          staff_id: person.id,
          is_representative: 0,
          person_name: personName(person),
          group_name: person.department,
          gender: person.gender,
          age: ageOn(person.dob, new Date(`${input.date}T00:00:00`)),
          phone: person.phone,
          dob: person.dob,
        })
      }
    }
    if (!attendees.length) throw new Error('Add at least one attendee.')
    const id = insert(db, 'trainings', {
      training_date: input.date,
      audience: input.audience,
      topic: input.topic.trim(),
      trainers: input.trainers || null,
      summary: input.summary || null,
      location: input.location || null,
      language: input.language || null,
      notes: input.notes || null,
      recorded_by: input.userId,
    }).id
    for (const attendee of attendees) {
      insert(db, 'training_attendees', { training_id: id, ...attendee })
    }
    audit(db, input.userId, 'create', 'training', id, { topic: input.topic, attendees: attendees.length })
    return { id, attendees: attendees.length }
  })
}

export function importFarmers(db: DB, rows: Record<string, string>[], userId: number) {
  return transaction(db, () => {
    if (rows.length > 5000) throw new Error('Import 5,000 rows or fewer at a time.')
    const user = get<any>(db, 'select name from users where id = ?', userId)
    let inserted = 0
    let skipped = 0
    const errors: string[] = []
    rows.forEach((row, index) => {
      const first = row.first_name || ''
      const last = row.last_name || ''
      if (!first || !last) {
        errors.push(`Row ${index + 2}: first and last name are required.`)
        return
      }
      if (row.farmer_code && get(db, 'select id from farmers where farmer_code = ?', row.farmer_code)) {
        skipped += 1
        return
      }
      const group = row.group_code ? get<any>(db, 'select id from groups where code = ?', row.group_code) : null
      if (row.group_code && !group) {
        errors.push(`Row ${index + 2}: group ${row.group_code} does not exist.`)
        return
      }
      const code = row.farmer_code || `F-${String(nextSeq(db, 'farmer')).padStart(4, '0')}`
      insert(db, 'farmers', {
        farmer_code: code,
        first_name: first,
        last_name: last,
        gender: row.gender || null,
        dob: /^\d{4}-\d{2}-\d{2}$/.test(row.dob || '') ? row.dob : null,
        national_id: row.national_id || null,
        phone: row.phone || null,
        group_id: group?.id || null,
        district: row.district || null,
        subcounty: row.subcounty || null,
        parish: row.parish || null,
        village: row.village || null,
        membership_date: /^\d{4}-\d{2}-\d{2}$/.test(row.membership_date || '') ? row.membership_date : null,
        status: 'active',
        household_size: row.household_size ? Number(row.household_size) : null,
        education: row.education || null,
        marital_status: row.marital_status || null,
        main_enterprise: row.main_enterprise || null,
        consent_store: 1,
        consent_sms: 0,
        added_by: userId,
        recorded_by_name: row.recorded_by || user?.name || null,
        notes: row.notes || 'Imported historical record',
      })
      inserted += 1
    })
    audit(db, userId, 'import', 'farmer', null, { inserted, skipped, errors: errors.length })
    return { inserted, skipped, errors }
  })
}

export function booksAreSound(db: DB) {
  const problems: string[] = []
  const tb = trialBalance(db, '2099-12-31')
  if (tb.gap) problems.push(`Trial balance gap ${tb.gap}`)
  const bs = balanceSheet(db, '2099-12-31')
  if (bs.gap) problems.push(`Balance sheet gap ${bs.gap}`)
  const flow = cashFlow(db, '2026-07-01', '2099-12-31')
  if (flow.gap) problems.push(`Cash flow gap ${flow.gap}`)
  const payable = payableControl(db)
  if (payable.book !== payable.subledger) problems.push(`Payables ${payable.book} vs ${payable.subledger}`)
  const stock = sh(Number(get<{ s: number }>(db, 'select coalesce(sum(total_cost),0) as s from batches')?.s || 0))
  if (stock !== accountBalance(db, '1100')) problems.push(`Inventory ${accountBalance(db, '1100')} vs batches ${stock}`)
  const inputStock = sh(
    Number(get<{ s: number }>(db, 'select coalesce(sum(qty_on_hand * unit_cost),0) as s from input_items')?.s || 0),
  )
  if (inputStock !== accountBalance(db, '1400')) problems.push(`Input stock ${accountBalance(db, '1400')} vs items ${inputStock}`)
  const memberLoans = sh(
    Number(get<{ s: number }>(db, "select coalesce(sum(outstanding),0) as s from loans where book = 'member'")?.s || 0),
  )
  if (memberLoans !== accountBalance(db, '1200')) problems.push(`Member loans ${accountBalance(db, '1200')} vs ${memberLoans}`)
  const inputLoans = sh(
    Number(get<{ s: number }>(db, "select coalesce(sum(outstanding),0) as s from loans where book = 'input'")?.s || 0),
  )
  if (inputLoans !== accountBalance(db, '1300')) problems.push(`Input loans ${accountBalance(db, '1300')} vs ${inputLoans}`)
  const facilities = sh(Number(get<{ s: number }>(db, 'select coalesce(sum(outstanding),0) as s from facilities')?.s || 0))
  if (facilities !== accountBalance(db, '2100')) problems.push(`Facilities ${accountBalance(db, '2100')} vs ${facilities}`)
  for (const code of ['1000', '1010', '1020']) {
    if (accountBalance(db, code) < 0) problems.push(`Negative cash account ${code}`)
  }
  const negative = get<{ c: number }>(db, 'select count(*) as c from batches where qty < -0.001 or total_cost < -1')
  if (negative?.c) problems.push('Negative stock')
  return problems
}
