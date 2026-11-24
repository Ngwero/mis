import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { toCsv } from '@/lib/csv'
import { getDb } from '@/lib/db'
import { getReport } from '@/lib/reports'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) return new Response('Sign in required', { status: 401 })
  const params = request.nextUrl.searchParams
  const slug = params.get('report') || ''
  try {
    const report = getReport(getDb(), slug, {
      from: params.get('from') || '',
      to: params.get('to') || '',
      group: params.get('group') || '',
      produce: params.get('produce') || '',
      q: params.get('q') || '',
    }, user.role)
    if (!report) return new Response('Unknown report', { status: 404 })
    const csv = toCsv(report.columns, report.rows)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.csv"`,
      },
    })
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Export failed', { status: 403 })
  }
}
