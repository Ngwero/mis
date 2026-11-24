import { PageHeader, Table } from '@/components/ui'
import { sendMessageAction } from '@/lib/actions'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { prettyDate } from '@/lib/format'
import { canWrite } from '@/lib/rbac'
import { all, get } from '@/lib/sql'

export const metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const user = await guard('messages')
  const db = getDb()
  const settings = get<any>(db, 'select sms_gateway from settings where id = 1')
  const rows = all<any>(db, `select m.*, (select count(*) from message_recipients r where r.message_id = m.id) as recipients
    from messages m order by m.created_at desc`)
  const groups = all<any>(db, 'select id, name from groups order by name')
  const farmers = all<any>(db, "select id, first_name || ' ' || last_name as name from farmers where status = 'active' order by first_name")
  return (
    <div>
      <PageHeader eyebrow="Engage" title="Messages" lede="Write market information or a notice in any language. Delivery and payment messages are recorded from those screens. No SMS leaves this server until a gateway is connected." />
      <p className="mb-4 text-sm text-muted">Gateway: {settings.sms_gateway === 'not_connected' ? 'not connected. Messages are stored for the cooperative record and for reports.' : settings.sms_gateway}</p>
      {canWrite(user.role, 'messages') ? (
        <form action={sendMessageAction} className="card mb-4 form-grid p-4">
          <label className="field"><span>Audience</span><select name="audience" defaultValue="group"><option value="farmer">One member</option><option value="group">A group</option><option value="all">All active members</option></select></label>
          <label className="field"><span>Member</span><select name="farmer_id"><option value="">—</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
          <label className="field"><span>Group</span><select name="group_id">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label className="field"><span>Language</span><input name="language" defaultValue="English" /></label>
          <label className="field"><span>Channel</span><select name="channel"><option value="sms">SMS record</option><option value="notice">Notice</option></select></label>
          <label className="field wide"><span>Subject</span><input name="subject" required /></label>
          <label className="field full"><span>Message</span><textarea name="body" required /></label>
          <div className="field"><button className="btn btn-primary" type="submit">Record message</button></div>
        </form>
      ) : null}
      <div className="card">
        <Table rows={rows} columns={[
          { key: 'created_at', label: 'When', render: (row) => prettyDate(row.created_at) },
          { key: 'language', label: 'Language' },
          { key: 'event_type', label: 'Event' },
          { key: 'subject', label: 'Subject' },
          { key: 'recipients', label: 'Recipients', align: 'right' },
          { key: 'skipped_consent', label: 'Skipped', align: 'right' },
          { key: 'status', label: 'Status' },
        ]} />
      </div>
    </div>
  )
}
