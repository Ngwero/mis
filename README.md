# CoopMIS

A management information system for a producer cooperative: members, staff, gardens, training, councils, traceable produce, stock, credit, messages, and accounts.

The sample society, **Rwenzori Highland Coffee Growers Cooperative Society Ltd**, is fictional. Names, phone numbers, and identity numbers in the sample season are not real people.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Node.js 22 or newer is required because the database uses the built-in SQLite module.

Sign in with a sample role:

| Person | Role | Email | Password |
| --- | --- | --- | --- |
| Amina Nyangoma | Administrator | amina@rwenzori.coop | Admin#2026 |
| Peter Mumbere | Field officer | peter@rwenzori.coop | Field#2026 |
| Grace Biira | Finance officer | grace@rwenzori.coop | Finance#2026 |
| Board Review | Viewer | board@rwenzori.coop | Board#2026 |

The database file is `data/coopmis.sqlite`. It is created on first launch. `npm run db:reset` deletes it so the sample season is loaded again.

## A lot to follow

Search trace code `RHC-26-00007`. It is Peter Kule's cherry from Upper Ridge, then parchment, green, roasted, and a sale to Kasese Coffee Bar. `RHC-26-B001` is two receipts bulked into one parchment lot. `RHC-26-F013` is maize milled to flour.

## What is included

Staff and payroll, farmer biodata and the person who recorded it, shares, gardens with GPS and inspections, training attendance (including representatives), youth and women councils, collections with quality prices and trace codes, farmer payments, bulk and individual sales, batch conversions, input issues and varieties, loans and facilities, messages, an income statement, balance sheet and cash flow, and filtered reports that print or export to CSV.

Field officers do not open payroll, the ledger, or credit. Finance posts money movements. Viewers can read and export. A full backup is limited to administrators, managers, and finance, and it leaves passwords out.

SMS is stored for the record. Nothing is sent to a phone network unless a gateway is added later. Payroll deductions are illustrative, not statutory advice.
