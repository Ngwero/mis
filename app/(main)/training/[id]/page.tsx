import { notFound } from 'next/navigation'
import { PageHeader, Table } from '@/components/ui'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate } from '@/lib/format'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Training register' }

export default async function TrainingDetail({ params }: { params: Promise<{ id: string }> }) {
  await guard('training')
  const { id } = await params
  const training = get<any>(getDb(), 'select * from trainings where id = ?', id)
  if (!training) notFound()
  const attendees = all<any>(getDb(), 'select * from training_attendees where training_id = ? order by is_representative, person_name', id)
  const women = attendees.filter((row) => row.gender === 'Female').length
  const men = attendees.filter((row) => row.gender === 'Male').length
  return (
    <div>
      <PageHeader eyebrow={prettyDate(training.training_date)} title={training.topic} lede={training.summary} />
      <section className="card p-5">
        <dl className="kv">
          <dt>Trainers</dt><dd>{training.trainers || '—'}</dd>
          <dt>Location</dt><dd>{training.location || '—'}</dd>
          <dt>Language</dt><dd>{training.language || '—'}</dd>
          <dt>Audience</dt><dd>{training.audience} · {women} female · {men} male · {attendees.length} total</dd>
          <dt>Additional information</dt><dd>{training.notes || '—'}</dd>
        </dl>
      </section>
      <section className="card mt-4">
        <Table rows={attendees} columns={[
          { key: 'group_name', label: 'Group' },
          { key: 'person_name', label: 'Name' },
          { key: 'gender', label: 'Gender' },
          { key: 'age', label: 'Age', align: 'right' },
          { key: 'phone', label: 'Contact' },
          { key: 'kind', label: 'Kind', render: (row) => row.is_representative ? 'Representative' : 'Member' },
        ]} />
      </section>
    </div>
  )
}
