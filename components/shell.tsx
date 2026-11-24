'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logout } from '@/lib/actions'
import { ROLE_LABEL, type NavItem } from '@/lib/rbac'

export function Shell({
  user,
  items,
  coop,
  children,
}: {
  user: { name: string; role: string }
  items: NavItem[]
  coop: string
  children: React.ReactNode
}) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])

  const groups: { name: string; items: NavItem[] }[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (!last || last.name !== item.group) groups.push({ name: item.group, items: [item] })
    else last.items.push(item)
  }

  const initials = user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')

  return (
    <div className="app-shell">
      {open ? <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="mark">C</div>
          <div>
            <strong>CoopMIS</strong>
            <small>{coop}</small>
          </div>
        </div>
        <nav>
          {groups.map((group) => (
            <div key={group.name}>
              <div className="nav-group">{group.name}</div>
              {group.items.map((item) => {
                const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(`${item.href}/`))
                return (
                  <Link key={item.href} href={item.href} className={`nav-link${active ? ' active' : ''}`}>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{ROLE_LABEL[user.role] || user.role}</small>
            </div>
          </div>
          <form action={logout}>
            <button className="btn btn-ghost w-full" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <button className="btn btn-ghost menu-btn" type="button" onClick={() => setOpen(true)}>Menu</button>
          <strong>{coop}</strong>
        </div>
        {children}
      </div>
    </div>
  )
}
