import type { DatabaseSync } from 'node:sqlite'

export type DB = DatabaseSync
export type Row = Record<string, any>

function quote(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error('Unsafe identifier')
  }
  return `"${identifier}"`
}

export function all<T = Row>(db: DB, sql: string, ...params: any[]): T[] {
  return db.prepare(sql).all(...params).map((row) => ({ ...row })) as T[]
}

export function get<T = Row>(db: DB, sql: string, ...params: any[]): T | undefined {
  const row = db.prepare(sql).get(...params)
  return row ? ({ ...row } as T) : undefined
}

export function run(db: DB, sql: string, ...params: any[]) {
  const result = db.prepare(sql).run(...params)
  return { id: Number(result.lastInsertRowid), changes: Number(result.changes) }
}

export function insert(db: DB, table: string, data: Record<string, unknown>) {
  const keys = Object.keys(data).filter((key) => data[key] !== undefined)
  const sql = `insert into ${quote(table)} (${keys.map(quote).join(',')}) values (${keys.map(() => '?').join(',')})`
  return run(db, sql, ...keys.map((key) => data[key]))
}

export function update(db: DB, table: string, id: number, data: Record<string, unknown>) {
  const keys = Object.keys(data).filter((key) => data[key] !== undefined)
  if (!keys.length) return { id, changes: 0 }
  const sql = `update ${quote(table)} set ${keys.map((key) => `${quote(key)} = ?`).join(', ')} where id = ?`
  return run(db, sql, ...keys.map((key) => data[key]), id)
}

export function transaction<T>(db: DB, fn: () => T): T {
  if (db.isTransaction) return fn()
  db.exec('BEGIN')
  try {
    const value = fn()
    db.exec('COMMIT')
    return value
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  }
}

export function nextSeq(db: DB, name: string) {
  run(
    db,
    `insert into sequences(name, value) values(?, 1)
     on conflict(name) do update set value = value + 1`,
    name,
  )
  return Number(get<{ value: number }>(db, 'select value from sequences where name = ?', name)?.value || 0)
}

export function audit(
  db: DB,
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  details?: unknown,
) {
  insert(db, 'audit_log', {
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    details: details == null ? null : JSON.stringify(details),
    created_at: new Date().toISOString(),
  })
}
