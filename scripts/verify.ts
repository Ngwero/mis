import { getDb } from '../lib/db.ts'
import { balanceSheet, trialBalance } from '../lib/finance.ts'

const db = getDb()
const farmers = db.prepare('select count(*) as c from farmers').get() as { c: number }
const tb = trialBalance(db, '2026-11-24')
const sheet = balanceSheet(db, '2026-11-24')
console.log(JSON.stringify({ farmers: farmers.c, trial: tb.gap, balance: sheet.gap, assets: sheet.sections[0].total }, null, 2))
