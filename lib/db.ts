import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { schema } from './schema'
import { seed } from './seed'
import { get, type DB } from './sql'

const globalForDb = globalThis as unknown as { coopmis?: DB }

function databaseFile() {
  const dir = process.env.VERCEL ? path.join('/tmp', 'coopmis') : path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'coopmis.sqlite')
}

export function getDb() {
  if (globalForDb.coopmis) return globalForDb.coopmis
  const db = new DatabaseSync(databaseFile())
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(process.env.VERCEL ? 'PRAGMA journal_mode = DELETE' : 'PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec(schema)
  const users = get<{ c: number }>(db, 'select count(*) as c from users')
  if (!users?.c) seed(db)
  globalForDb.coopmis = db
  return db
}
