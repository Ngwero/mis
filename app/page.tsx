import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Flash } from '@/components/flash'
import { login } from '@/lib/actions'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { get } from '@/lib/sql'

const demos = [
  ['Amina Nyangoma', 'Administrator', 'amina@rwenzori.coop', 'Admin#2026'],
  ['Peter Mumbere', 'Field officer', 'peter@rwenzori.coop', 'Field#2026'],
  ['Grace Biira', 'Finance officer', 'grace@rwenzori.coop', 'Finance#2026'],
  ['Board Review', 'Board viewer', 'board@rwenzori.coop', 'Board#2026'],
]

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  const settings = get<any>(getDb(), 'select name, season_label from settings where id = 1')
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand">
          <div className="mark">C</div>
          <div>
            <strong>CoopMIS</strong>
            <small>Producer cooperative records</small>
          </div>
        </div>
        <h1 className="mt-6 font-display text-4xl leading-tight text-ink">{settings?.name}</h1>
        <p className="lede">
          Members, gardens, traceable produce, stock, credit, and accounts.
          This copy uses a fictional society and a full {settings?.season_label || 'season'}.
        </p>
        <div className="mt-4"><Suspense fallback={null}><Flash /></Suspense></div>
        <form action={login} className="mt-4 stack">
          <label className="field full"><span>Email</span><input name="email" type="email" autoComplete="username" required /></label>
          <label className="field full"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="btn btn-primary" type="submit">Enter the system</button>
        </form>
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted">Sample roles</p>
        <div className="login-roles">
          {demos.map(([name, role, email, password]) => (
            <form key={email} action={login}>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <button className="btn btn-ghost h-full w-full flex-col items-start py-3" type="submit">
                <span>{name}</span>
                <span className="muted text-xs font-semibold">{role}</span>
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  )
}
