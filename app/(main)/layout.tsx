import { Suspense } from 'react'
import { Flash } from '@/components/flash'
import { Shell } from '@/components/shell'
import { guard } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { NAV, canSee } from '@/lib/rbac'
import { get } from '@/lib/sql'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await guard('dashboard')
  const settings = get<any>(getDb(), 'select short_name from settings where id = 1')
  const items = NAV.filter((item) => canSee(user.role, item.area))
  return (
    <Shell user={user} items={items} coop={settings?.short_name || 'CoopMIS'}>
      <Suspense fallback={null}><Flash /></Suspense>
      {children}
    </Shell>
  )
}
