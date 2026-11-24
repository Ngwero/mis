export type Role = 'admin' | 'manager' | 'field' | 'finance' | 'viewer'

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  field: 'Field officer',
  finance: 'Finance officer',
  viewer: 'Board / partner viewer',
}

const HIDDEN: Record<string, string[]> = {
  admin: [],
  manager: [],
  field: ['payroll', 'finance', 'users', 'import', 'credit'],
  finance: ['users', 'import'],
  viewer: ['users', 'import'],
}

const WRITE: Record<string, string[]> = {
  field: [
    'farmers',
    'groups',
    'gardens',
    'training',
    'collections',
    'messages',
    'services',
    'inspections',
    'councils',
    'stock',
    'inputs',
  ],
  finance: ['payments', 'sales', 'credit', 'finance', 'payroll', 'shares', 'stock', 'inputs', 'prices'],
}

const FINANCE_REPORTS = ['income-statement', 'balance-sheet', 'cash-flow', 'payroll', 'loans']

export function canSee(role: string, area: string) {
  return !(HIDDEN[role] || []).includes(area)
}

export function canWrite(role: string, area: string) {
  if (area === 'users' || area === 'import' || area === 'settings') return role === 'admin'
  if (role === 'admin' || role === 'manager') return true
  return (WRITE[role] || []).includes(area)
}

export function canBackup(role: string) {
  return role === 'admin' || role === 'manager' || role === 'finance'
}

export function canSeePay(role: string) {
  return role !== 'field'
}

export function canSeeReport(role: string, slug: string) {
  if (role === 'field' && FINANCE_REPORTS.includes(slug)) return false
  return true
}

export type NavItem = { href: string; label: string; area: string; group: string }

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', area: 'dashboard', group: 'Overview' },
  { href: '/staff', label: 'Staff', area: 'staff', group: 'People' },
  { href: '/payroll', label: 'Payroll', area: 'payroll', group: 'People' },
  { href: '/farmers', label: 'Farmers', area: 'farmers', group: 'People' },
  { href: '/groups', label: 'Groups', area: 'groups', group: 'People' },
  { href: '/shares', label: 'Shares', area: 'shares', group: 'People' },
  { href: '/councils', label: 'Councils', area: 'councils', group: 'People' },
  { href: '/gardens', label: 'Gardens', area: 'gardens', group: 'Field' },
  { href: '/training', label: 'Training', area: 'training', group: 'Field' },
  { href: '/collections', label: 'Collections', area: 'collections', group: 'Produce' },
  { href: '/trace', label: 'Traceability', area: 'collections', group: 'Produce' },
  { href: '/payments', label: 'Farmer payments', area: 'payments', group: 'Produce' },
  { href: '/sales', label: 'Sales', area: 'sales', group: 'Produce' },
  { href: '/stock', label: 'Stock', area: 'stock', group: 'Produce' },
  { href: '/inputs', label: 'Inputs & varieties', area: 'inputs', group: 'Produce' },
  { href: '/credit', label: 'Credit', area: 'credit', group: 'Finance' },
  { href: '/finance', label: 'Financial statements', area: 'finance', group: 'Finance' },
  { href: '/messages', label: 'Messages', area: 'messages', group: 'Engage' },
  { href: '/reports', label: 'Reports', area: 'reports', group: 'System' },
  { href: '/import', label: 'Import', area: 'import', group: 'System' },
  { href: '/audit', label: 'Audit log', area: 'audit', group: 'System' },
  { href: '/users', label: 'Users & access', area: 'users', group: 'System' },
  { href: '/settings', label: 'Settings', area: 'settings', group: 'System' },
]
