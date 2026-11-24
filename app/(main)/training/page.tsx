import Link from 'next/link'
import { TrainingForm } from '@/components/forms'
import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { ageOn, prettyDate } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all } from '@/lib/sql'

export const metadata = { title: 'Training' }

export default async function TrainingPage() {
  const user = await guard('training')
  const db = getDb()
  const rows = all<any>(db, `select t.*, (select count(*) from training_attendees a where a.training_id = t.id) as attendees
    from trainings t order by t.training_date desc`)
  const farmers = all<any>(db, `select f.id, f.first_name || ' ' || f.last_name as name, g.name as group_name, f.gender, f.dob, f.phone
    from farmers f left join groups g on g.id = f.group_id where f.status = 'active' order by f.first_name`)
  const staff = all<any>(db, "select id, first_name || ' ' || last_name as name, position from staff where status = 'active' order by first_name")
  return (
    <div>
      <PageHeader eyebrow="Field" title="Training" lede="Trainers, topic, summary, and an attendance list taken from the farmer or staff register. Representatives can be added beside members." />
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'training_date', label: 'Date', render: (row) => prettyDate(row.training_date) },
          { key: 'topic', label: 'Topic', render: (row) => <Link className="font-semibold text-leaf" href={`/training/${row.id}`}>{row.topic}</Link> },
          { key: 'trainers', label: 'Trainers' },
          { key: 'audience', label: 'Audience' },
          { key: 'attendees', label: 'Attendees', align: 'right' },
        ]} />
      </div>
      {canWrite(user.role, 'training') ? (
        <details className="card details mt-4">
          <summary>Record a training</summary>
          <div className="pad">
            <TrainingForm
              farmers={farmers.map((farmer) => ({ ...farmer, age: ageOn(farmer.dob) }))}
              staff={staff}
            />
          </div>
        </details>
      ) : null}
    </div>
  )
}
