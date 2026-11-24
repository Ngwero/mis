import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { canBackup } from '@/lib/rbac'
import { all, audit } from '@/lib/sql'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSession()
  if (!user) return new Response('Sign in required', { status: 401 })
  if (!canBackup(user.role)) return new Response('Your role cannot download a full backup.', { status: 403 })
  const db = getDb()
  const tables = all<{ name: string }>(db, "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
  const dump: { exported_at: string; tables: Record<string, unknown[]> } = {
    exported_at: new Date().toISOString(),
    tables: {},
  }
  for (const table of tables) {
    if (!/^[a-z_]+$/.test(table.name)) continue
    const rows = all(db, `select * from ${table.name}`)
    if (table.name === 'users') rows.forEach((row) => { row.password_hash = '[redacted]' })
    dump.tables[table.name] = rows
  }
  audit(db, user.id, 'backup', 'database', null, { tables: Object.keys(dump.tables).length })
  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="coopmis-backup.json"',
    },
  })
}
