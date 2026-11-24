import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { canSee } from './rbac'
import { getDb } from './db'
import { get } from './sql'
import { readSession, signSession } from './password'

export type SessionUser = {
  id: number
  name: string
  email: string
  role: string
  staff_id: number | null
}

const COOKIE = 'coopmis_session'

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const payload = readSession(token)
  if (!payload) return null
  const user = get<SessionUser & { active: number }>(
    getDb(),
    'select id, name, email, role, staff_id, active from users where id = ?',
    payload.uid,
  )
  if (!user || !user.active) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role, staff_id: user.staff_id }
}

export async function setSession(userId: number) {
  const jar = await cookies()
  jar.set(COOKIE, signSession({ uid: userId, exp: Date.now() + 12 * 24 * 60 * 60 * 1000 }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 24 * 60 * 60,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

export async function requireUser() {
  const user = await getSession()
  if (!user) redirect('/')
  return user
}

export async function guard(area: string) {
  const user = await requireUser()
  if (!canSee(user.role, area)) {
    redirect('/dashboard?error=' + encodeURIComponent('Your role does not include that area.'))
  }
  return user
}
