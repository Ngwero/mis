import crypto from 'crypto'

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const actual = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export function sessionSecret() {
  return process.env.SESSION_SECRET || 'coopmis-local-dev-secret'
}

export function signSession(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readSession(token: string): { uid: number; exp: number } | null {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as { uid?: unknown; exp?: unknown }
    if (typeof data.uid !== 'number' || typeof data.exp !== 'number') return null
    if (data.exp < Date.now()) return null
    return { uid: data.uid, exp: data.exp }
  } catch {
    return null
  }
}
