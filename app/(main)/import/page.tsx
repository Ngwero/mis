import { PageHeader } from '@/components/ui'
import { importFarmersAction } from '@/lib/actions'
import { guard } from '@/lib/auth'

export const metadata = { title: 'Import' }

export default async function ImportPage() {
  await guard('import')
  return (
    <div>
      <PageHeader eyebrow="System" title="Import historical records" lede="Bring in a membership book that was kept in a spreadsheet. Existing farmer codes are skipped. SMS consent is left off until a member agrees." />
      <form action={importFarmersAction} className="card max-w-xl stack p-5">
        <p className="text-sm">Columns: first_name, last_name, gender, dob, phone, national_id, group_code, district, subcounty, parish, village, membership_date, household_size, education, marital_status, main_enterprise, farmer_code, recorded_by, notes. Dates must be YYYY-MM-DD. Group codes must already exist.</p>
        <a className="text-sm font-semibold text-leaf" href="/samples/historical-farmers.csv">Download a sample file</a>
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button className="btn btn-primary" type="submit">Import farmers</button>
      </form>
    </div>
  )
}
