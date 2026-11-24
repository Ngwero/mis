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
  const settings = get<any>(getDb(), 'select name, short_name, season_label from settings where id = 1')
  return (
    <main className="login">
      <section className="login-visual">
        <img
          src="/photos/coffee-cherries.jpg"
          alt="Green coffee cherries on the branch, photographed by Carlos Torres"
        />
        <div className="login-visual-copy">
          <div className="brand">
            <div className="mark">C</div>
            <div>
              <strong>CoopMIS</strong>
              <small>{settings?.short_name || 'Producer cooperative'}</small>
            </div>
          </div>
          <div className="login-story">
            <p className="login-kicker">Producer cooperative</p>
            <h1>Highland coffee, on the books.</h1>
            <p className="lede">
              Members, gardens, deliveries, and accounts for {settings?.short_name || 'the cooperative'}, kept together for the {settings?.season_label || 'current season'}.
            </p>
            <ul className="login-points">
              <li>Every delivery can be followed from garden to sale</li>
              <li>Office and field work from the same records</li>
              <li>The books stay in balance</li>
            </ul>
            <p className="login-credit">Photograph by Carlos Torres. Pexels.</p>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div>
          <div className="login-card">
            <h2>Sign in</h2>
            <p className="lede">Enter your cooperative account, or click a sample account below.</p>
            <div className="mt-4"><Suspense fallback={null}><Flash /></Suspense></div>
            <form action={login} className="mt-4 stack">
              <label className="field full"><span>Email</span><input name="email" type="email" autoComplete="username" required /></label>
              <label className="field full"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="btn btn-primary w-full" type="submit">Sign in</button>
            </form>
            <div className="login-samples">
              <p>Sample accounts</p>
              <div className="login-roles">
                {demos.map(([name, role, email, password]) => (
                  <form key={email} action={login}>
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="password" value={password} />
                    <button type="submit">
                      <span>{name}</span>
                      <span>{role}</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
